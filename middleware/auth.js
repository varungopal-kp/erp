const jwt = require('jsonwebtoken');
module.exports.isAuthorized = function(req, res, next) {
	try {
		// return next();

		if (
			req.path == '/api/' ||
			req.path == '/auth' ||
			req.path == '/api/auth/' ||
			req.path == '/' ||
			req.path == '/login'
		)
			return next();

		const token = req.headers.authorization.split(' ')[1];

		const decodedToken = jwt.verify(token, process.env.JWT_KEY);

		req.user = decodedToken.data || null;

		next();
	} catch (error) {
		return res.status(401).json({
			success: false,
			message: 'Authentication failure!',
			error: 'Authentication failure!'
		});
	}
};

module.exports.isAuthorizedForApp = function(req, res, next) {
	try {
		// return next()
		if (
			req.path == '/api/' ||
			req.path == '/api/auth' ||
			req.path == '/api/auth/' ||
			req.path == '/' ||
			req.path == '/login'
		)
			return next();

		const token = req.headers.token.split(' ')[1];

		const decodedToken = jwt.verify(token, process.env.JWT_KEY);

		req.user = decodedToken.user || null;

		next();
	} catch (error) {
		return res.status(200).json({
			success: false,
			message: 'Authentication failure!',
			error: 'Authentication failure!'
		});
	}
};
