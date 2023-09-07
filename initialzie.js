const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost/my-database', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

// Define the schema and model for product transactions
const transactionSchema = new mongoose.Schema({
  dateOfSale: String,
  productTitle: String,
  productDescription: String,
  price: Number,
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Fetch data from the third-party API and insert it into the database
axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json')
  .then(response => {
    const data = response.data;

    data.forEach(item => {
      const transaction = new Transaction({
        dateOfSale: item.dateOfSale,
        productTitle: item.productTitle,
        productDescription: item.productDescription,
        price: item.price,
      });

      transaction.save()
        .then(() => {
          console.log('Transaction saved successfully');
        })
        .catch(error => {
          console.error('Error saving transaction:', error);
        });
    });

    console.log('Database initialized with seed data.');
  })
  .catch(error => {
    console.error('Error fetching data from the third-party API:', error);
  });

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
