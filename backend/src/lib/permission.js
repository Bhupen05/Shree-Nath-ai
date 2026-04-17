function hasPermission(grantedPermissions, requiredPermission) {
  if (!Array.isArray(grantedPermissions)) {
    return false;
  }

  if (grantedPermissions.includes('*') || grantedPermissions.includes(requiredPermission)) {
    return true;
  }

  const requiredScope = String(requiredPermission || '').split(':')[0];
  if (!requiredScope) {
    return false;
  }

  return grantedPermissions.includes(`${requiredScope}:*`);
}

module.exports = {
  hasPermission,
};
