const Property = require('../../models/Property');
const Resident = require('../../models/Resident');
const TenantCompany = require('../../models/TenantCompany');
const CoworkingMember = require('../../models/CoworkingMember');
const logger = require('../../config/logger');

class CctvPermissionService {
  /**
   * Determine whether a user is authorized to receive or view a specific CCTV alert or live feed
   * @param {object} user - Authenticated user req.user
   * @param {object} device - CctvDevice
   * @param {object} [context] - { propertyType, zoneId, unitOrSpaceId }
   * @returns {Promise<boolean>}
   */
  static async canAccessCamera(user, device, context = {}) {
    if (!user) return false;

    // 1. Platform Super Admin can access all
    if (user.isPlatformAdmin || user.primaryRole === 'PLATFORM_OWNER') {
      return true;
    }

    // 2. Organisation isolation
    if (String(user.organisationId) !== String(device.organisationId)) {
      return false;
    }

    // 3. Organisation Owner and Property Manager
    const role = (user.primaryRole || '').toUpperCase();
    if (['ORGANISATION_OWNER', 'ORGANISATION_ADMIN'].includes(role)) {
      return true;
    }

    if (role === 'PROPERTY_MANAGER') {
      // Must match assigned property
      return !user.propertyId || String(user.propertyId) === String(device.propertyId);
    }

    // 4. Security Guards and Facility Managers
    if (['SECURITY_GUARD', 'FACILITY_MANAGER'].includes(role)) {
      return !user.propertyId || String(user.propertyId) === String(device.propertyId);
    }

    // 5. Explicit camera whitelist
    if (device.allowedUserIds && device.allowedUserIds.some(id => String(id) === String(user._id))) {
      return true;
    }

    // Fetch Property to evaluate propertyType rules
    const property = await Property.findById(device.propertyId);
    if (!property) return false;

    const propType = property.propertyType;
    const zone = device.zoneId || 'COMMON_AREA';

    // -------------------------------------------------------------
    // RESIDENTIAL / APARTMENT PROPERTY TYPE RULES
    // -------------------------------------------------------------
    if (propType === 'RESIDENTIAL' && role === 'RESIDENT') {
      // Residents can only receive alerts from public common zones (Main Gate, Visitor Gate, Delivery Entrance)
      const PUBLIC_RESIDENTIAL_ZONES = [
        'MAIN_GATE', 'EXIT_GATE', 'VISITOR_GATE', 'DELIVERY_ENTRANCE',
        'MAIN_ENTRANCE', 'LOBBY', 'COMMON_AREA'
      ];

      // Residents cannot see private security rooms, electrical/server rooms, or restricted cameras
      if (['SECURITY_ROOM', 'RESTRICTED_AREA', 'FIRE_EXIT_CONTROL', 'SERVER_ROOM'].includes(zone)) {
        return false;
      }

      return PUBLIC_RESIDENTIAL_ZONES.includes(zone);
    }

    // -------------------------------------------------------------
    // COMMERCIAL PROPERTY TYPE RULES
    // -------------------------------------------------------------
    if (propType === 'COMMERCIAL' && ['TENANT', 'COMMERCIAL_TENANT'].includes(role)) {
      // Tenants cannot access restricted building zones (Server room, Electrical room, other tenant areas)
      if (['SERVER_ROOM', 'ELECTRICAL_ROOM', 'RESTRICTED_AREA', 'MANAGEMENT_OFFICE'].includes(zone)) {
        return false;
      }

      // Check tenant's leased floor or unit mapping
      if (device.unitOrSpaceId) {
        const tenantCompany = await TenantCompany.findOne({
          organisationId: user.organisationId,
          primaryContactEmail: user.email
        });
        if (tenantCompany) {
          // If camera belongs to a unit, verify tenant leases it
          const leasesUnit = tenantCompany.leasedUnits && tenantCompany.leasedUnits.some(
            u => String(u) === String(device.unitOrSpaceId)
          );
          return leasesUnit;
        }
      }

      // Public commercial zones: Main entrance, visitor reception, parking
      const PUBLIC_COMMERCIAL_ZONES = ['MAIN_ENTRANCE', 'RECEPTION', 'PARKING', 'LIFT_LOBBY'];
      return PUBLIC_COMMERCIAL_ZONES.includes(zone);
    }

    // -------------------------------------------------------------
    // CO-WORKING PROPERTY TYPE RULES
    // -------------------------------------------------------------
    if (propType === 'COWORKING' && ['MEMBER', 'COWORKING_MEMBER'].includes(role)) {
      // Members must not receive camera alerts from other private cabins, server rooms, or restricted areas
      if (['SERVER_ROOM', 'RESTRICTED_AREA', 'PRIVATE_CABIN', 'ELECTRICAL_ROOM'].includes(zone)) {
        // If private cabin, only allow if the member is assigned to this specific unit
        if (zone === 'PRIVATE_CABIN' && device.unitOrSpaceId) {
          const member = await CoworkingMember.findOne({ userId: user._id });
          if (member && String(member.assignedUnitId) === String(device.unitOrSpaceId)) {
            return true;
          }
        }
        return false;
      }

      // Common coworking spaces: Reception, shared workspace, pantry, cafe
      const PUBLIC_COWORKING_ZONES = ['RECEPTION', 'SHARED_WORKSPACE', 'PANTRY', 'MAIN_ENTRANCE', 'EVENT_AREA'];
      return PUBLIC_COWORKING_ZONES.includes(zone);
    }

    return false;
  }
}

module.exports = CctvPermissionService;
