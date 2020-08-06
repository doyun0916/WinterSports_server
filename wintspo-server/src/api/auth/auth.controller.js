const Joi = require('joi');
const Account = require('models/account');
const nodemailer = require('nodemailer');

exports.mailcheck = async (ctx) => {
	let transporter = nodemailer.createTransport({
		service: 'gmail',
		host: 'smtp.gmail.com',
		port: 587,
		secure: false,
		auth: {
			user: process.env.NODEMAILER_USER,
			pass: process.env.NODEMAILER_PASS,
		},
	});
	let code = "123456";

	let info = await transporter.sendMail({
		from: `"WintSpo Team" <${process.env.NODEMAILER_USER}>`,
		to: ctx.request.body.email,
		subject: 'WintSpo Auth Number',
		text: code,
		html: `<b>${code}</b>`,
	});
};

exports.localRegister = async (ctx) => {
	
	const schema = Joi.object().keys({
		username: Joi.string().alphanum().min(4).max(15).required(),
		email: Joi.string().email().required(),
		password: Joi.string().required().min(6)
	});

	const result = schema.validate(ctx.request.body);
	
	if(result.error) {
		ctx.status = 400;
		return;
	}

	let existing = null;
	try {
		existing = await Account.findByEmailOrUsername(ctx.request.body);
	} catch (e) {
		ctx.throw(500, e);
	}

	if(existing) {
		ctx.status = 409;
		ctx.body = {
			key: existing.email === ctx.request.body.email ? 'email' : 'username'
		};
		return;
	}

	let account = null;
	try {
		account = await Account.localRegister(ctx.request.body);
	} catch (e) {
		ctx.throw(500, e);
	}

	let token = null;
	try {
		token = await account.generateToken();
	} catch (e) {
		ctx.throw(500, e);
	}

	ctx.cookies.set('access_token', token, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 });
	ctx.body = account.profile;
};

exports.localLogin = async (ctx) => {
	const schema = Joi.object().keys({
		email: Joi.string().email().required(),
		password: Joi.string().required()
	});

	const result = schema.validate(ctx.request.body);

	if(result.error) {
		ctx.status = 400;
		return;
	}

	const { email, password } = ctx.request.body;

	let account = null;
	try {
		account = await Account.findByEmail(email);
	} catch (e) {
		ctx.throw(500, e);
	}

	if(!account || !account.validatePassword(password)) {
		ctx.status = 403;
		return;
	}

	let token = null;
	try {
		token = await account.generateToken();
	} catch (e) {
		ctx.throw(500, e);
	}

	ctx.cookies.set('access_token', token, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 });
	ctx.body = account.profile;
};

exports.exists = async (ctx) => {
	const { key, value } = ctx.params;
    let account = null;

    try {
        // key 에 따라 findByEmail 혹은 findByUsername 을 실행합니다.
        account = await (key === 'email' ? Account.findByEmail(value) : Account.findByUsername(value));    
    } catch (e) {
        ctx.throw(500, e);
    }

    ctx.body = {
        exists: account !== null
    };
};

exports.logout = (ctx) => {
    ctx.cookies.set('access_token', null, {
        maxAge: 0, 
        httpOnly: true
    });
    ctx.status = 204;
};

exports.check = (ctx) => {
	const { user } = ctx.request;
	if(!user) {
		ctx.status = 403;
		return;
	}
	ctx.body = user.profile;
};
