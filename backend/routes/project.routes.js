const express = require('express');
const router = express.Router();
const {
  createProject, getProjects, getProjectById,
  updateProject, deleteProject, applyToProject, getMyProjects,
  requestJoinProject, getJoinRequests, acceptJoinRequest, rejectJoinRequest,
  getProjectMembers, getProjectChatMessages, sendProjectChatMessage
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

// Project Join Requests routes
router.post('/:projectId/request-join', requestJoinProject);
router.get('/:projectId/join-requests', getJoinRequests);
router.patch('/:projectId/join-requests/:requestId/accept', acceptJoinRequest);
router.patch('/:projectId/join-requests/:requestId/reject', rejectJoinRequest);

// Project Members route
router.get('/:projectId/members', getProjectMembers);

// Project Chat routes
router.get('/:projectId/chat', getProjectChatMessages);
router.post('/:projectId/chat', sendProjectChatMessage);

module.exports = router;
