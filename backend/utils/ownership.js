const requireOwnership = (model, idParam = 'id', ownerFields = 'userId') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      if (!resourceId) {
        return res.status(400).json({ message: `Missing route param ${idParam}` });
      }

      const doc = await model.findById(resourceId);
      if (!doc || doc.isDeleted) {
        return res.status(404).json({ message: 'Not found' });
      }

      const fields = Array.isArray(ownerFields) ? ownerFields : [ownerFields];
      const userId = req.user.userId;

      const isOwner = fields.some(fld => {
        const val = doc[fld];
        if (!val) return false;
        if (Array.isArray(val)) {
          return val.map(v => v.toString()).includes(userId);
        }
        return val.toString() === userId;
      });

      const isAdmin = req.user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      req.resource = doc; // optional: downstream can reuse
      next();
    } catch (err) {
      console.error('Ownership middleware error:', err);
      res.status(500).json({ message: 'Server error during ownership check' });
    }
  };
};

module.exports = { requireOwnership };

