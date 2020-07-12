let AWS = require("aws-sdk");
let ical = require('ical-generator');

//
//	Bringing S3 to life.
//
let s3 = new AWS.S3({
	apiVersion: '2006-03-01'
});

//
//	This lambda is responsible for being invoked by S3, load up the Object, 
//	and send out an email, based on the data found in the JSON file.
//
exports.handler = (event) => {

	return new Promise(function(resolve, reject) {

		//
		//	1. This container holds all the data to be passed around the chain.
		//
		let container = {
			req: {
				bucket_name: event.Records[0].s3.bucket.name,
				object_key: event.Records[0].s3.object.key
			},
			//
			//	Storing here the S3 object.
			//
			message: {},
			//	
			//	Store the row email that we genereate.
			//
			raw_email: "",
			//
			//	The default response for Lambda.
			//
			res: {
                message: "OK"
            }
		}

		//
		//	->	Start the chain.
		//
		load_object(container)
			.then(function(container) {

				return write_message_to_self(container);

			}).then(function(container) {

				return save_object_to_self(container);

			}).then(function(container) {

				return get_webinar_date(container);

			}).then(function(container) {

				return make_ical(container);

			}).then(function(container) {

				return write_message_to_user(container);

			}).then(function(container) {

				return save_object_to_user(container);

			}).then(function(container) {

				//
				//  ->  Send back the good news.
				//
				return resolve(container.res);

			}).catch(function(error) {

				//
				//	->	Stop and surface the error.
				//
				return reject(error);

			});
	});
};

//	 _____    _____     ____    __  __   _____    _____   ______    _____
//	|  __ \  |  __ \   / __ \  |  \/  | |_   _|  / ____| |  ____|  / ____|
//	| |__) | | |__) | | |  | | | \  / |   | |   | (___   | |__    | (___
//	|  ___/  |  _  /  | |  | | | |\/| |   | |    \___ \  |  __|    \___ \
//	| |      | | \ \  | |__| | | |  | |  _| |_   ____) | | |____   ____) |
//	|_|      |_|  \_\  \____/  |_|  |_| |_____| |_____/  |______| |_____/
//

//
//	In this step we are going to load the object which trigerd this lamda,
//	so we can see what type of misteries are hiddin in it.
//
function load_object(container)
{
	return new Promise(function(resolve, reject) {

		console.info("load_object");
		
		//
		//	1.	Prepare the query.
		//
		let params = {
			Bucket: container.req.bucket_name,
			Key: container.req.object_key
		};

		//
		//	-> Execute the query.
		//
		s3.getObject(params, function (error, data) {

			//
			//	1.	Check for internal errors.
			//
			if(error)
			{
				console.info(params);
				return reject(error);
			} 

			//
			//	2.	Save the object for the next promise.
			//
			container.user_details = JSON.parse(data.Body.toString());
			
			//
			//	->	Move to the next promise.
			//
			return resolve(container);
		
		});

	});
}

function write_message_to_self(container)
{
	return new Promise(function(resolve, reject) {

		console.info("write_message_to_self");
		
		//
		//	1.	Convert the S3 payload in to a string and jsut use it as it is
		//		since we don't need anything fancy for ourselfs.
		//
		let user_details = JSON.stringify(container.user_details, null, 4);
		
		//
		//	2.	Make the body message.
		//
		let body = "Hi Self, \n\n There was a new signup on the Webinar page. Bellow are all the details:\n\n"
					+ user_details
					+ "\n\n"
					+ "Thank you."

		//
		//	3.	Save it for the next promise.
		//
		container.message = {
			name: "David Gatti",
			email: "david@0x4447.com",
			subject: "Webinar subscription",
			body: body
		}

		//
		//	->	Move to the next promise.
		//
		return resolve(container);
		

	});
}

function save_object_to_self(container)
{
	return new Promise(function(resolve, reject) {

		console.info("save_object_to_self");
		
		//
		//	1.	Prepare the query.
		//
		let params = {
			Bucket: '0x4447-web-us-east-1-smtp',
			Key: Math.floor(Date.now() / 1000) + '.json',
			Body: JSON.stringify(container.message)
		};

		//
		//	-> Execute the query.
		//
		s3.putObject(params, function (error, data) {

			//
			//	1.	Check for internal errors.
			//
			if(error)
			{
				console.info(params);
				return reject(error);
			} 
			
			//
			//	->	Move to the next promise.
			//
			return resolve(container);
		
		});

	});
}

function get_webinar_date(container)
{
	return new Promise(function(resolve, reject) {

		console.info("get_webinar_date");
		
		//
		//	1.	Prepare the query.
		//
		let params = {
			Bucket: 'webinars.0x4447.com.db.events',
			Key: 'latest_time.json'
		};

		//
		//	-> Execute the query.
		//
		s3.getObject(params, function (error, data) {

			//
			//	1.	Check for internal errors.
			//
			if(error)
			{
				console.info(params);
				return reject(error);
			} 

			//
			//	2.	Save the object for the next promise.
			//
			container.date = JSON.parse(data.Body.toString());
			
			//
			//	->	Move to the next promise.
			//
			return resolve(container);
		
		});

	});
}

function make_ical(container)
{
	return new Promise(function(resolve, reject) {

		console.info("make_ical");
		
		let cal = ical({
			domain: '0x4447.com',
			prodId: {company: 'superman-industries.com', product: 'ical-generator'},
			name: '0x4447 Webinar',
			timezone: 'Europe/Berlin',
			
		});

		cal.prodId({
			company: '0x4447',
			product: 'Webinar',
			language: 'EN'
		});

		let event = cal.createEvent({
			start: container.date.time,
			end: container.date.time,
			summary: 'Learning about stuff',
			description: 'Epic place to learn',
			organizer: 'David Gatti <david@0x4447.com>',
			url: 'https://webinars.0x4447.com/'
		});

		event.createAttendee({email: 'aws@chime.aws', name: 'AWS'});
		event.createAttendee({email: 'david@0x4447.com', name: 'David Gatti'});
		event.createAttendee({ email: 'bob@0x4447.com', name: 'Bob Jhon', rsvp: true });
			
		event.createAlarm({
			type: 'audio',
			trigger: 300 * 6, // 5min before event
		});

		container.ics = Buffer.from(cal.toString()).toString('base64');

		//
		//	->	Move to the next promise.
		//
		return resolve(container);
		

	});
}

function write_message_to_user(container)
{
	return new Promise(function(resolve, reject) {

		console.info("write_message_to_user");
		
		//
		//	1.	Make the body message.
		//
		let body = "Hi User, \n\n There was a new signup on the Webinar page. Bellow are all the details:\n\n"
					+ "\n\n"
					+ "Thank you."

		//
		//	3.	Save it for the next promise.
		//
		container.message_user = {
			name: "David Gatti",
			email: "david@0x4447.com",
			subject: "Webinar subscription",
			body: body,
			attachments: [
				{
					name: 'calenadar_event.ics',
					data: container.ics
				}
			]
		}

		//
		//	->	Move to the next promise.
		//
		return resolve(container);
		

	});
}

function save_object_to_user(container)
{
	return new Promise(function(resolve, reject) {

		console.info("save_object_to_user");
		
		//
		//	1.	Prepare the query.
		//
		let params = {
			Bucket: '0x4447-web-us-east-1-smtp',
			Key: Math.floor(Date.now() / 1000) + '.json',
			Body: JSON.stringify(container.message_user)
		};

		//
		//	-> Execute the query.
		//
		s3.putObject(params, function (error, data) {

			//
			//	1.	Check for internal errors.
			//
			if(error)
			{
				console.info(params);
				return reject(error);
			} 
			
			//
			//	->	Move to the next promise.
			//
			return resolve(container);
		
		});

	});
}