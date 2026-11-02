import express from "express";

const app = express();
const PORT = 4000;

// Middleware to parse JSON bodies
app.use(express.json());

// In-memory cart (no database)
let cartItems = [
  {
    id: 1,
    productName: "Wireless Mouse",
    price: 799,
    quantity: 2,
    category: "Electronics",
  },
  {
    id: 2,
    productName: "Keyboard",
    price: 1200,
    quantity: 1,
    category: "Electronics",
  },
  {
    id: 3,
    productName: "Water Bottle",
    price: 399,
    quantity: 2,
    category: "Accessories",
  },
];

// ---------- Helpers ----------
function withTotalPrice(product) {
  return {
    ...product,
    totalPrice: Number(product.price) * Number(product.quantity),
  };
}

function isValidProduct(product, requireAll = false) {
  if (!product || typeof product !== "object" || Array.isArray(product))
    return false;

  if (requireAll) {
    if (
      product.id === undefined ||
      product.productName === undefined ||
      product.price === undefined ||
      product.quantity === undefined ||
      product.category === undefined
    ) {
      return false;
    }
  }

  if (product.id !== undefined && !Number.isInteger(Number(product.id)))
    return false;
  if (
    product.productName !== undefined &&
    String(product.productName).trim().length === 0
  )
    return false;
  if (
    product.price !== undefined &&
    !(Number.isFinite(Number(product.price)) && Number(product.price) >= 0)
  )
    return false;
  if (
    product.quantity !== undefined &&
    !(
      Number.isInteger(Number(product.quantity)) && Number(product.quantity) > 0
    )
  )
    return false;
  if (product.category !== undefined && typeof product.category !== "string")
    return false;

  return true;
}

// ---------- GET /cart ----------
app.get("/cart", (req, res) => {
  res.status(200).json(cartItems.map(withTotalPrice));
});

// ---------- GET /cart/:id ----------
app.get("/cart/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Product ID must be a number." });
  }

  const product = cartItems.find((item) => item.id === id);
  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  return res.status(200).json(withTotalPrice(product));
});

// ---------- POST /cart ----------
app.post("/cart", (req, res) => {
  const product = req.body;

  if (!isValidProduct(product, true)) {
    return res.status(400).json({
      message:
        "Invalid product. Provide id, productName, price, quantity and category.",
    });
  }

  const newProduct = {
    id: Number(product.id),
    productName: String(product.productName).trim(),
    price: Number(product.price),
    quantity: Number(product.quantity),
    category: String(product.category),
  };

  if (cartItems.some((item) => item.id === newProduct.id)) {
    return res
      .status(409)
      .json({ message: "A product with this ID already exists." });
  }

  cartItems.push(newProduct);
  return res.status(201).json({
    message: "Product added successfully",
    product: withTotalPrice(newProduct),
  });
});

// ---------- PUT /cart/:id ----------
app.put("/cart/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Product ID must be a number." });
  }

  const index = cartItems.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "Product not found." });
  }

  const updates = req.body;
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    return res
      .status(400)
      .json({ message: "Request body must be a JSON object." });
  }

  const allowed = ["productName", "price", "quantity", "category"];
  const hasAllowed = allowed.some((f) =>
    Object.prototype.hasOwnProperty.call(updates, f),
  );

  if (!hasAllowed) {
    return res.status(400).json({
      message: "Provide at least one product field to update.",
    });
  }

  // Ignore any client-supplied id — the route param wins
  const merged = { ...cartItems[index], ...updates, id };

  if (!isValidProduct(merged, true)) {
    return res.status(400).json({ message: "Invalid product details." });
  }

  merged.productName = String(merged.productName).trim();
  merged.price = Number(merged.price);
  merged.quantity = Number(merged.quantity);
  merged.category = String(merged.category);

  cartItems[index] = merged;

  return res.status(200).json({
    message: "Product updated successfully",
    product: withTotalPrice(merged),
  });
});

// ---------- DELETE /cart/:id ----------
app.delete("/cart/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Product ID must be a number." });
  }

  const index = cartItems.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "Product not found." });
  }

  const [deleted] = cartItems.splice(index, 1);

  return res.status(200).json({
    message: "Product removed successfully",
    product: withTotalPrice(deleted),
  });
});

// ---------- 404 for unknown routes (JSON, before error handler) ----------
app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

// ---------- JSON body-parse error handler ----------
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ message: "Invalid JSON request body." });
  }
  return res.status(500).json({ message: "Internal server error." });
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`Express Server running at http://localhost:${PORT}`);
});
