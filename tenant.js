// ─── tenant.js ────────────────────────────────────────────────────────────────
// Rutas REST para gestión de tenants: categorías y preguntas desde el panel admin.

const { getTenantData } = require('./store');

function registerTenantRoutes(app) {

  app.get('/api/tenant/:id', (req, res) => {
    res.json(getTenantData(req.params.id));
  });

  app.post('/api/tenant/:id/categories', (req, res) => {
    const td = getTenantData(req.params.id);
    td.categories = req.body.categories;
    res.json({ ok: true });
  });

  app.post('/api/tenant/:id/questions', (req, res) => {
    const td = getTenantData(req.params.id);
    td.questions = { ...td.questions, ...req.body.questions };
    res.json({ ok: true });
  });
}

module.exports = { registerTenantRoutes };