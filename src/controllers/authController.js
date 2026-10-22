const User = require('../models/User');
const Organisation = require('../models/Organisation');
const Property = require('../models/Property');
const UserRoleAssignment = require('../models/UserRoleAssignment');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/tokenUtil');
const { sendSuccess, sendError } = require('../utils/responseFormatter');
const { logAudit } = require('../middlewares/auditMiddleware');

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, password, organisationId, propertyId, primaryRole } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'User with this email already exists', 400, 'USER_EXISTS');
    }

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      mobile,
      password,
      organisationId: organisationId || null,
      propertyId: propertyId || null,
      primaryRole: primaryRole || 'RESIDENT'
    });

    await logAudit(req, {
      action: 'REGISTER',
      module: 'AUTH',
      recordId: newUser._id,
      newData: { email, primaryRole }
    });

    return sendSuccess(res, 'User registered successfully', {
      user: {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        primaryRole: newUser.primaryRole
      }
    }, null, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400, 'VALIDATION_ERROR');
    }

    const cleanIdentifier = email.toLowerCase().trim();
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier },
        { mobile: email.trim() }
      ]
    }).select('+password');
    if (!user) {
      return sendError(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'ACTIVE' || user.isDeleted) {
      return sendError(res, 'Account is inactive or suspended', 403, 'ACCOUNT_INACTIVE');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Fetch Organisation and Properties for context
    let organisation = null;
    let properties = [];
    if (user.organisationId) {
      organisation = await Organisation.findById(user.organisationId);
      properties = await Property.find({ organisationId: user.organisationId, isDeleted: false });
    } else if (user.isPlatformAdmin) {
      properties = await Property.find({ isDeleted: false }).limit(20);
    }

    // Token generation
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      primaryRole: user.primaryRole,
      isPlatformAdmin: user.isPlatformAdmin,
      organisationId: user.organisationId
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    await logAudit(req, {
      action: 'LOGIN',
      module: 'AUTH',
      recordId: user._id,
      newData: { email: user.email, primaryRole: user.primaryRole }
    });

    return sendSuccess(res, 'Login successful', {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        mobile: user.mobile,
        avatar: user.avatar,
        primaryRole: user.primaryRole,
        isPlatformAdmin: user.isPlatformAdmin,
        organisationId: user.organisationId,
        propertyId: user.propertyId
      },
      organisation,
      properties,
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return sendError(res, 'Refresh token required', 400, 'TOKEN_REQUIRED');
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.status !== 'ACTIVE' || user.refreshToken !== token) {
      return sendError(res, 'Invalid refresh token', 401, 'INVALID_TOKEN');
    }

    const tokenPayload = {
      userId: user._id,
      email: user.email,
      primaryRole: user.primaryRole,
      isPlatformAdmin: user.isPlatformAdmin,
      organisationId: user.organisationId
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    user.refreshToken = newRefreshToken;
    await user.save();

    return sendSuccess(res, 'Tokens refreshed successfully', {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    return sendError(res, 'Invalid or expired refresh token', 401, 'TOKEN_EXPIRED');
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let organisation = null;
    let properties = [];

    if (user.organisationId) {
      organisation = await Organisation.findById(user.organisationId);
      properties = await Property.find({ organisationId: user.organisationId, isDeleted: false });
    } else if (user.isPlatformAdmin) {
      properties = await Property.find({ isDeleted: false });
    }

    return sendSuccess(res, 'Profile fetched successfully', {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        mobile: user.mobile,
        avatar: user.avatar,
        primaryRole: user.primaryRole,
        isPlatformAdmin: user.isPlatformAdmin,
        organisationId: user.organisationId,
        propertyId: user.propertyId
      },
      organisation,
      properties
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Seed accounts quick fetch for instant testing
const getQuickAccounts = async (req, res) => {
  try {
    const users = await User.find({ isDeleted: false })
      .select('firstName lastName email primaryRole organisationId isPlatformAdmin')
      .populate('organisationId', 'name type code')
      .limit(10);

    const accounts = users.map(u => ({
      _id: u._id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.primaryRole,
      isPlatformAdmin: u.isPlatformAdmin,
      orgName: u.organisationId ? u.organisationId.name : 'System Platform',
      orgType: u.organisationId ? u.organisationId.type : 'PLATFORM'
    }));

    return sendSuccess(res, 'Quick accounts list', { accounts });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  getMe,
  getQuickAccounts
};
