import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// In-memory cart (no database required)
let cartItems = [
  { id: 1, productName: "Wireless Mouse", price: 799, quantity: 2 },
  { id: 2, productName: "Keyboard", price: 1200, quantity: 1 },
  { id: 3, productName: "USB Cable", price: 299, quantity: 3 },
];

// ---------- Helpers ----------
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(data, null, 2));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON request body."));
      }
    });
    req.on("error", reject);
  });
}

function isValidProduct(product) {
  return (
    product &&
    Number.isInteger(Number(product.id)) &&
    String(product.productName ?? "").trim().length > 0 &&
    Number.isFinite(Number(product.price)) &&
    Number(product.price) >= 0 &&
    Number.isInteger(Number(product.quantity)) &&
    Number(product.quantity) > 0
  );
}

// ---------- Server ----------
const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`,
  );
  // Normalize trailing slashes (e.g. "/cart/" -> "/cart")
  const pathname = requestUrl.pathname.replace(/\/+$/, "") || "/";

  // GET /
  if (req.method === "GET" && pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Welcome to Shopping Cart Management</h1>");
    return;
  }

  // GET /cart
  if (req.method === "GET" && pathname === "/cart") {
    sendJson(res, 200, cartItems);
    return;
  }

  // GET /about
  if (req.method === "GET" && pathname === "/about") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<h1>About</h1><p>This is a Shopping Cart Management application built with the Node.js HTTP module.</p>",
    );
    return;
  }

  // GET /home  (serve public/index.html via FS module)
  if (req.method === "GET" && pathname === "/home") {
    const indexPath = path.join(__dirname, "public", "index.html");
    fs.readFile(indexPath, "utf8", (error, data) => {
      if (error) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Unable to read the home page.");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(data);
    });
    return;
  }

  // POST /add-to-cart
  if (req.method === "POST" && pathname === "/add-to-cart") {
    try {
      const product = await readRequestBody(req);

      if (!isValidProduct(product)) {
        sendJson(res, 400, {
          message:
            "Invalid product. Required fields: id, productName, price and quantity.",
        });
        return;
      }

      const newProduct = {
        id: Number(product.id),
        productName: String(product.productName).trim(),
        price: Number(product.price),
        quantity: Number(product.quantity),
      };

      if (cartItems.some((item) => item.id === newProduct.id)) {
        sendJson(res, 409, {
          message: "A product with this ID already exists.",
        });
        return;
      }

      cartItems.push(newProduct);
      sendJson(res, 201, {
        message: "Product added to cart successfully.",
        product: newProduct,
      });
    } catch (error) {
      sendJson(res, 400, { message: error.message });
    }
    return;
  }

  // 404 fallback
  sendJson(res, 404, { message: "Route not found." });
});

server.listen(PORT, () => {
  console.log(`HTTP Server running at http://localhost:${PORT}`);
});
