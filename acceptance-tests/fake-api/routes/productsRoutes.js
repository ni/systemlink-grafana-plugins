import { db } from '../database/db.js';

class ProductsRoutes {
    queryProducts(req, res) {
        if (req.method !== 'POST') {
            return;
        }

        res.status(200).json({ products: db.products, totalCount: db.products.length });
    }
}

export const productsRoutes = new ProductsRoutes();
