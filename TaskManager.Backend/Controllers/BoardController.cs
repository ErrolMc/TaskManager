using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManager.Backend.Contracts.Boards;
using TaskManager.Backend.Models;
using TaskManager.Backend.Models.Enums;
using TaskManager.Backend.Repositories;

namespace TaskManager.Backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/board")]
    public class BoardController : ControllerBase
    {
        private readonly ILogger<BoardController> _logger;
        private readonly IBoardRepository _boardRepository;
        private readonly IBoardMemberRepository _boardMemberRepository;

        public BoardController(
            ILogger<BoardController> logger,
            IBoardRepository boardRepository,
            IBoardMemberRepository boardMemberRepository)
        {
            _logger = logger;
            _boardRepository = boardRepository;
            _boardMemberRepository = boardMemberRepository;
        }

        [HttpPost("create")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateBoard([FromBody] CreateBoardRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.BoardName))
                return BadRequest("Board name is required");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            DateTime nowUTC = DateTime.UtcNow;
            var board = new Board
            {
                ID = Guid.NewGuid().ToString(),
                Name = request.BoardName.Trim(),
                Description = request.BoardDescription.Trim(),
                OwnerUserID = currentUserID,
                CreatedAtUTC = nowUTC,
                UpdatedAtUTC = nowUTC
            };

            bool boardCreated = await _boardRepository.CreateBoardAsync(board);
            if (!boardCreated)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to create board");

            var ownerMembership = new BoardMember
            {
                BoardID = board.ID,
                UserID = currentUserID,
                Role = Role.Owner,
                JoinedAtUTC = nowUTC
            };

            bool boardMemberCreated = await _boardMemberRepository.CreateBoardMemberAsync(ownerMembership);
            if (!boardMemberCreated)
            {
                _logger.LogError("Failed to create board owner membership for board {BoardID}", board.ID);
                await _boardRepository.DeleteBoardAsync(board.ID);
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to create board membership");
            }

            return Ok(new CreateBoardResponse
            {
                BoardID = board.ID,
                BoardName = board.Name,
                BoardDescription = board.Description
            });
        }

        [HttpPost("delete")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteBoard([FromBody] DeleteBoardRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.BoardID))
                return BadRequest("Board ID is required");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            Board? board = await _boardRepository.GetBoardByIdAsync(request.BoardID);
            if (board == null)
                return NotFound("Board not found");

            if (board.OwnerUserID != currentUserID)
                return Forbid();

            bool boardMembersDeleted = await _boardMemberRepository.DeleteBoardMembersAsync(request.BoardID);
            if (!boardMembersDeleted)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to delete board members");

            bool boardDeleted = await _boardRepository.DeleteBoardAsync(request.BoardID);
            if (!boardDeleted)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to delete board");

            return Ok("Board deleted successfully");
        }

        private string? GetCurrentUserID()
        {
            return User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");
        }
    }
}
