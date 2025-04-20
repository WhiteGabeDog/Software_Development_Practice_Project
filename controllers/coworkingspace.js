const CoWorkingSpace = require("../models/CoWorkingSpace");
const Appointment = require("../models/Appointment");
//@desc Get all co-working space
//@route GET /api/v1/coworkingspaces
//@access Public
exports.getCoWorkingSpaces = async (req, res, next) => {
  let query;

  //Copy req.query
  const reqQuery = { ...req.query };

  //Fields to execute
  const removeFields = ["select", "sort", "page", "limit"];

  //Loop over remove fields and delete them from reqQuery
  removeFields.forEach((param) => delete reqQuery[param]);
  console.log(reqQuery);

  let queryStr = JSON.stringify(req.query);
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`
  );

  query = CoWorkingSpace.find(JSON.parse(queryStr)).populate("appointments");

  //Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(",").join(" ");
    query = query.select(fields);
  }
  //Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  //Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  try {
    const total = await CoWorkingSpace.countDocuments();
    query = query.skip(startIndex).limit(limit);

    //Execute query
    const coworkingSpace = await query;

    //Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res
      .status(200)
      .json({
        success: true,
        count: coworkingSpace.length,
        data: coworkingSpace,
      });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

//@desc Get single coworkingspace
//@route GET /api/v1/coworkingspaces/:id
//@access Public
exports.getCoWorkingSpace = async (req, res, next) => {
  try {
    const coworkingSpace = await CoWorkingSpace.findById(req.params.id);

    if (!coworkingSpace) {
      return res.status(400).json({ success: false });
    }
    res.status(200).json({ success: true, data: coworkingSpace });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

//@desc Create a coworkingspace
//@route POST /api/v1/coworkingspaces
//@access Private
exports.createCoWorkingSpace = async (req, res, next) => {
  try {
    const coworkingSpace = await CoWorkingSpace.create(req.body);
    res.status(201).json({
      success: true,
      data: coworkingSpace,
    });
  } catch (err) {
    res.status(400).json({success:false, error:err.message || "Server Error"});
  }
};

//@desc Update single coworkingspace
//@route PUT /api/v1/coworkingspaces/:id
//@access Private
exports.updateCoWorkingSpace = async (req, res, next) => {
  try {
    // Find the id and update it
    const coworkingSpace = await CoWorkingSpace.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!coworkingSpace) {
      return res.status(400).json({ success: false });
    }
    res.status(200).json({ success: true, data: coworkingSpace });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

//@desc Delete single coworkingspace
//@route DELETE /api/v1/coworkingspaces/:id
//@access Private
exports.deleteCoWorkingSpace = async (req, res, next) => {
  try {
    // Find the id and delete it
    const coWorkingSpace = await CoWorkingSpace.findById(req.params.id);

    if (!coWorkingSpace) {
      return res
        .status(404)
        .json({
          success: false,
          message: `CoWorkingSpace not found with id of ${req.params.id}`,
        });
    }
    await Appointment.deleteMany({ coWorkingSpace: req.params.id });
    await CoWorkingSpace.deleteOne({ _id: req.params.id });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};
