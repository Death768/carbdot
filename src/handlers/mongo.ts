import mongoose from 'mongoose';

module.exports = () => {
	mongoose.connect('mongodb://localhost:27017/carbdot');
	mongoose.connection.on('connected', () => {
		console.log('Connected to MongoDB');
	});
	mongoose.connection.on('error', (err) => {
		console.error(err);
	});
}