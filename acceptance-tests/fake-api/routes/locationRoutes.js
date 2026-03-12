import { locations } from '../database/locations.js';

class LocationsRoutes {
    listLocations(_req, res) {
        res.status(200).json({
            locations
        });
    }
}
export const locationsRoutes = new LocationsRoutes();
