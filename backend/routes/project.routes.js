const express = require('express');
const router = express.Router();
const {
  createProject, getProjects, getProjectById,
  updateProject, deleteProject, applyToProject, getMyProjects
} = require('../controllers/project.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// Static paths BEFORE dynamic /:id
router.get('/my', getMyProjects);
router.get('/', getProjects);
router.post('/', createProject);

// Dynamic paths after
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/apply', applyToProject);

module.exports = router;
