const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost/my-database', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

// Define the schema and model for product transactions (if not already defined)
const transactionSchema = new mongoose.Schema({
  dateOfSale: String,
  productTitle: String,
  productDescription: String,
  price: Number,
  category: String, // Add a category field to the schema
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// API to list all transactions (same as before)
// ...
app.get('/transactions', async (req, res) => {
    const { month, search = '', page = 1, perPage = 10 } = req.query;
  
    const offset = (page - 1) * perPage;
    const filter = {
      dateOfSale: { $regex: `.*${month}.*`, $options: 'i' }, // Case-insensitive search
      $or: [
        { productTitle: { $regex: `.*${search}.*`, $options: 'i' } },
        { productDescription: { $regex: `.*${search}.*`, $options: 'i' } },
        { price: { $regex: `.*${search}.*`, $options: 'i' } },
      ],
    };
  
    try {
      const totalRecords = await Transaction.countDocuments(filter);
      const totalPages = Math.ceil(totalRecords / perPage);
  
      const transactions = await Transaction.find(filter)
        .skip(offset)
        .limit(perPage);
  
      res.json({
        transactions,
        pagination: {
          page,
          perPage,
          totalRecords,
          totalPages,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

// API for statistics (same as before)
// ...
app.get('/statistics', async (req, res) => {
    const { month } = req.query;
  
    // Calculate total sale amount of selected month
    const totalSaleAmount = await Transaction.aggregate([
      {
        $match: {
          dateOfSale: { $regex: `.*${month}.*`, $options: 'i' },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$price' },
        },
      },
    ]);
  
    // Calculate total number of sold items of selected month
    const totalSoldItems = await Transaction.countDocuments({
      dateOfSale: { $regex: `.*${month}.*`, $options: 'i' },
    });
  
    // Calculate total number of not sold items of selected month
    const totalNotSoldItems = await Transaction.countDocuments({
      dateOfSale: { $regex: `.*${month}.*`, $options: 'i' },
      productTitle: { $exists: false },
    });
  
    res.json({
      totalSaleAmount: totalSaleAmount[0]?.totalAmount || 0,
      totalSoldItems,
      totalNotSoldItems,
    });
  });

// API for the bar chart (same as before)
// ...
app.get('/bar-chart', async (req, res) => {
    const { month } = req.query;
  
    // Define price ranges
    const priceRanges = [
      { min: 0, max: 100 },
      { min: 101, max: 200 },
      { min: 201, max: 300 },
      { min: 301, max: 400 },
      { min: 401, max: 500 },
      { min: 501, max: 600 },
      { min: 601, max: 700 },
      { min: 701, max: 800 },
      { min: 801, max: 900 },
      { min: 901, max: Infinity },
    ];
  
    // Calculate the number of items in each price range for the selected month
    const priceRangeData = [];
  
    for (const range of priceRanges) {
      const count = await Transaction.countDocuments({
        dateOfSale: { $regex: `.*${month}.*`, $options: 'i' },
        price: { $gte: range.min, $lte: range.max },
      });
  
      priceRangeData.push({
        priceRange: `${range.min} - ${range.max}`,
        itemCount: count,
      });
    }
  
    res.json(priceRangeData);
  });
  

// API for the pie chart (same as before)
// ...
app.get('/pie-chart', async (req, res) => {
    const { month } = req.query;
  
    // Find unique categories and the number of items from each category for the selected month
    const categoryData = await Transaction.aggregate([
      {
        $match: {
          dateOfSale: { $regex: `.*${month}.*`, $options: 'i' },
        },
      },
      {
        $group: {
          _id: '$category',
          itemCount: { $sum: 1 },
        },
      },
    ]);
  
    res.json(categoryData);
  });
  

// API to combine data from all APIs
app.get('/combine-data', async (req, res) => {
  const { month } = req.query;

  try {
    // Fetch data from all APIs
    const transactions = await axios.get(`http://localhost:3000/transactions?month=${month}`);
    const statistics = await axios.get(`http://localhost:3000/statistics?month=${month}`);
    const barChartData = await axios.get(`http://localhost:3000/bar-chart?month=${month}`);
    const pieChartData = await axios.get(`http://localhost:3000/pie-chart?month=${month}`);

    // Combine the responses into a single JSON object
    const combinedData = {
      transactions: transactions.data,
      statistics: statistics.data,
      barChart: barChartData.data,
      pieChart: pieChartData.data,
    };

    res.json(combinedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
