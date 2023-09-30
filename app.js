require('dotenv').config(); // Configure dotenv to load in the .env file
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const listEndpoints = require('express-list-endpoints');
const helmet = require('helmet');
const cors = require('cors');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const expressValidator = require('express-validator');
const expressSanitizer = require('express-sanitizer');
const expressPaginate = require('express-paginate');
const fileUpload = require('express-fileupload');

const Auth = require('./middleware/auth');

var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');
var appRouter = require('./routes/mobileApp');
const CustomMiddleware = require('./middleware/custom');
const helper = require('./helpers/helper');

var app = express();

var whitelist = [
	'http://192.168.1.5',
	'http://localhost:3000',
	'http://192.168.1.5:3000',
	'http://192.168.0.122:3000',
	'http://13.234.171.213',
	'http://15.206.85.140',
	'http://3.7.24.80/',
	'*'
];

var corsOptions = {
	origin: function(origin, callback) {
		console.log(origin);
		if (whitelist.indexOf(origin) !== -1 || !origin) {
			callback(null, true);
		} else {
			callback(new Error('Not allowed by CORS'));
		}
	}
};

app.enable('trust proxy'); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)

const limiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 15 minutes
	max: 10000 // limit each IP to 100 requests per windowMs
});

//  apply to all requests
app.use(limiter);

app.use(cors());
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));

app.use(express.json({ limit: '50mb', extended: true }));
app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));

app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet());
app.use(expressValidator());
// app.use(fileUpload())

// Mount express-sanitizer middleware here
app.use(expressSanitizer());
 //app.use("/api", cors(corsOptions))
// app.use("/", Auth.isAuthorized, indexRouter)

app.use('/', indexRouter);

app.use('/api', CustomMiddleware.custom);
app.use('/api', expressPaginate.middleware(10, 100));
app.use('/api', Auth.isAuthorized, apiRouter);
// app.use("/api", apiRouter);
app.get('/api/endPoints', function(req, res) {
	res.send(listEndpoints(app));
});

app.use('/app', expressPaginate.middleware(10, 100));
app.use('/app', Auth.isAuthorizedForApp, appRouter);

// console.log(listEndpoints(app));
// catch 404 and forward to error handler
app.use(function(req, res, next) {
	next(createError(404, 'Something went wrong.'));
});

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;
