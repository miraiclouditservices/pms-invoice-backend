const Property = require('../models/Property');
const Building = require('../models/Building');
const Floor = require('../models/Floor');
const Unit = require('../models/Unit');

/**
 * Validates the full chain: Property -> Building -> Floor -> Unit/Space
 * Ensures strict organisation-level data isolation and correct parent-child relationships.
 */
const validateHierarchyChain = async ({ organisationId, propertyId, buildingId, floorId, unitId }) => {
  if (!propertyId) {
    throw new Error('Property ID is required');
  }

  const property = await Property.findOne({ _id: propertyId, organisationId, isDeleted: false });
  if (!property) {
    throw new Error('Property not found or access denied for this organisation');
  }

  let building = null;
  if (buildingId) {
    building = await Building.findOne({ _id: buildingId, organisationId, isDeleted: false });
    if (!building) {
      throw new Error('Building not found or access denied');
    }
    if (building.propertyId.toString() !== propertyId.toString()) {
      throw new Error(`Building "${building.name}" does not belong to Property "${property.name}"`);
    }
  }

  let floor = null;
  if (floorId) {
    floor = await Floor.findOne({ _id: floorId, organisationId, isDeleted: false });
    if (!floor) {
      throw new Error('Floor not found or access denied');
    }
    if (floor.propertyId.toString() !== propertyId.toString()) {
      throw new Error(`Floor "${floor.floorName}" does not belong to Property "${property.name}"`);
    }
    if (buildingId && floor.buildingId.toString() !== buildingId.toString()) {
      throw new Error(`Floor "${floor.floorName}" does not belong to Building "${building?.name}"`);
    }
  }

  let unit = null;
  if (unitId) {
    unit = await Unit.findOne({ _id: unitId, organisationId, isDeleted: false });
    if (!unit) {
      throw new Error('Unit/Space not found or access denied');
    }
    if (unit.propertyId.toString() !== propertyId.toString()) {
      throw new Error(`Unit "${unit.unitNumber}" does not belong to Property "${property.name}"`);
    }
    if (buildingId && unit.buildingId.toString() !== buildingId.toString()) {
      throw new Error(`Unit "${unit.unitNumber}" does not belong to Building "${building?.name}"`);
    }
    if (floorId && unit.floorId.toString() !== floorId.toString()) {
      throw new Error(`Unit "${unit.unitNumber}" does not belong to Floor "${floor?.floorName}"`);
    }
  }

  return { property, building, floor, unit };
};

/**
 * Automatically synchronizes Unit occupancy and cascades recalculation up to Floor, Building, and Property.
 */
const syncOccupancyCascade = async ({ unitId, occupancyStatus, session = null }) => {
  if (!unitId) return;

  const validStatuses = ['VACANT', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'];
  if (!validStatuses.includes(occupancyStatus)) {
    throw new Error(`Invalid occupancy status: ${occupancyStatus}`);
  }

  const unitQuery = Unit.findById(unitId);
  if (session) unitQuery.session(session);
  const unit = await unitQuery;
  if (!unit) return;

  unit.occupancyStatus = occupancyStatus;
  if (occupancyStatus === 'OCCUPIED') {
    unit.status = 'OCCUPIED';
  } else if (occupancyStatus === 'VACANT') {
    unit.status = 'VACANT';
  } else if (occupancyStatus === 'RESERVED') {
    unit.status = 'RESERVED';
  } else if (occupancyStatus === 'MAINTENANCE') {
    unit.status = 'UNDER_MAINTENANCE';
  }

  await unit.save({ session });

  // Recalculate rollup metrics for Property, Building, and Floor
  await recalculateHierarchyStats({
    propertyId: unit.propertyId,
    buildingId: unit.buildingId,
    floorId: unit.floorId,
    session
  });
};

/**
 * Recalculates total units and occupied units for Floor, Building, and Property.
 */
const recalculateHierarchyStats = async ({ propertyId, buildingId, floorId, session = null }) => {
  try {
    if (floorId) {
      const totalFloorUnits = await Unit.countDocuments({ floorId, isDeleted: false });
      const occupiedFloorUnits = await Unit.countDocuments({ floorId, occupancyStatus: 'OCCUPIED', isDeleted: false });
      await Floor.findByIdAndUpdate(
        floorId,
        {
          totalUnits: totalFloorUnits,
          occupiedUnits: occupiedFloorUnits,
          occupancyRate: totalFloorUnits > 0 ? Math.round((occupiedFloorUnits / totalFloorUnits) * 100) : 0
        },
        { session }
      );
    }

    if (buildingId) {
      const totalBldgUnits = await Unit.countDocuments({ buildingId, isDeleted: false });
      const occupiedBldgUnits = await Unit.countDocuments({ buildingId, occupancyStatus: 'OCCUPIED', isDeleted: false });
      await Building.findByIdAndUpdate(
        buildingId,
        {
          totalUnits: totalBldgUnits,
          occupiedUnits: occupiedBldgUnits,
          occupancyRate: totalBldgUnits > 0 ? Math.round((occupiedBldgUnits / totalBldgUnits) * 100) : 0
        },
        { session }
      );
    }

    if (propertyId) {
      const totalPropUnits = await Unit.countDocuments({ propertyId, isDeleted: false });
      const occupiedPropUnits = await Unit.countDocuments({ propertyId, occupancyStatus: 'OCCUPIED', isDeleted: false });
      await Property.findByIdAndUpdate(
        propertyId,
        {
          totalUnits: totalPropUnits,
          occupiedUnits: occupiedPropUnits,
          occupancyRate: totalPropUnits > 0 ? Math.round((occupiedPropUnits / totalPropUnits) * 100) : 0
        },
        { session }
      );
    }
  } catch (err) {
    console.error('Error during recalculateHierarchyStats:', err.message);
  }
};

module.exports = {
  validateHierarchyChain,
  syncOccupancyCascade,
  recalculateHierarchyStats
};
