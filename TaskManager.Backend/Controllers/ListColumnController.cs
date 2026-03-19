using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManager.Backend.Contracts.Api.ListColumns;
using TaskManager.Backend.Contracts.Shared;
using TaskManager.Backend.Models;
using TaskManager.Backend.Models.Enums;
using TaskManager.Backend.Repositories;
using TaskManager.Backend.Services;
using TaskManager.Backend.Contracts.Notifications;

namespace TaskManager.Backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/listcolumn")]
    public class ListColumnController : BaseTaskManagerController
    {
        private readonly ILogger<ListColumnController> _logger;
        private readonly IBoardRepository _boardRepository;
        private readonly IBoardMemberRepository _boardMemberRepository;
        private readonly IListColumnRepository _listColumnRepository;
        private readonly INotificationService _notificationService;

        public ListColumnController(
            ILogger<ListColumnController> logger,
            IBoardRepository boardRepository,
            IBoardMemberRepository boardMemberRepository,
            IListColumnRepository listColumnRepository,
            INotificationService notificationService)
        {
            _logger = logger;
            _boardRepository = boardRepository;
            _boardMemberRepository = boardMemberRepository;
            _listColumnRepository = listColumnRepository;
            _notificationService = notificationService;
        }

        [HttpPost("create")]
        [ProducesResponseType<ListColumn>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateListColumn([FromBody] CreateListColumnRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.BoardID))
                return BadRequest("Board ID is required");

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest("List column name is required");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            Board? board = await _boardRepository.GetBoardByIdAsync(request.BoardID);
            if (board == null)
                return NotFound("Board not found");

            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(request.BoardID, currentUserID);
            if (currentUserMembership == null)
                return Forbid();

            if (currentUserMembership.Role == Role.Viewer)
                return Forbid("Viewers cannot modify list columns");

            int nextPosition = await _listColumnRepository.GetNextPositionForBoardAsync(request.BoardID);

            DateTime nowUTC = DateTime.UtcNow;
            var listColumn = new ListColumn
            {
                ColumnID = Guid.NewGuid().ToString(),
                BoardID = request.BoardID,
                Name = request.Name.Trim(),
                Position = nextPosition,
                CreatedAtUTC = nowUTC,
                UpdatedAtUTC = nowUTC
            };

            bool listColumnCreated = await _listColumnRepository.CreateListColumnAsync(listColumn);
            if (!listColumnCreated)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to create list column");

            return Ok(listColumn);
        }

        [HttpPost("delete")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteListColumn([FromBody] string listColumnID)
        {
            if (string.IsNullOrWhiteSpace(listColumnID))
                return BadRequest("List column ID is required");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            ListColumn? listColumn = await _listColumnRepository.GetListColumnByIdAsync(listColumnID);
            if (listColumn == null)
                return NotFound("List column not found");

            string boardID = listColumn.BoardID;
            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(boardID, currentUserID);
            if (currentUserMembership == null)
                return Forbid();

            if (currentUserMembership.Role == Role.Viewer)
                return Forbid("Viewers cannot modify list columns");

            bool listColumnDeleted = await _listColumnRepository.DeleteListColumnAsync(listColumnID);
            if (!listColumnDeleted)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to delete list column");

            // send notification 
            List<ListColumn> columnPositions = await _listColumnRepository.GetListColumnsForBoardAsync(boardID);

            if (columnPositions != null)
            {
                bool sentNotification = await _notificationService.SendToBoardAsync(boardID,
                    new ColumnDeletedNotification()
                    {
                        SenderUserID = currentUserID,
                        BoardID = boardID,
                        DeletedColumnID = listColumnID,
                        ColumnsPositions = columnPositions.Select(c => new ItemPosition
                        {
                            Id = c.ColumnID,
                            Position = c.Position
                        }).ToList()
                    });
            }

            return Ok("List column deleted successfully");
        }

        [HttpPost("update")]
        [ProducesResponseType<ListColumn>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UpdateListColumn([FromBody] UpdateListColumnRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.ListColumnID))
                return BadRequest("List column ID is required");

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest("List column name is required");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            ListColumn? listColumn = await _listColumnRepository.GetListColumnByIdAsync(request.ListColumnID);
            if (listColumn == null)
                return NotFound("List column not found");

            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(listColumn.BoardID, currentUserID);
            if (currentUserMembership == null)
                return Forbid();

            if (currentUserMembership.Role == Role.Viewer)
                return Forbid("Viewers cannot modify list columns");

            bool listColumnUpdated = await _listColumnRepository.UpdateListColumnAsync(
                request.ListColumnID,
                request.Name.Trim());

            if (!listColumnUpdated)
            {
                _logger.LogError("Failed to update list column {ListColumnID}", request.ListColumnID);
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to update list column");
            }

            ListColumn? updatedListColumn = await _listColumnRepository.GetListColumnByIdAsync(request.ListColumnID);
            if (updatedListColumn == null)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to retrieve updated list column");

            return Ok(updatedListColumn);
        }

        [HttpPost("updateposition")]
        [ProducesResponseType<UpdateListColumnPositionResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UpdateListColumnPosition([FromBody] UpdateListColumnPositionRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.ListColumnID))
                return BadRequest("List column ID is required");

            if (request.NewPosition < 0)
                return BadRequest("New position must be greater than or equal to 0");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            ListColumn? listColumn = await _listColumnRepository.GetListColumnByIdAsync(request.ListColumnID);
            if (listColumn == null)
                return NotFound("List column not found");

            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(listColumn.BoardID, currentUserID);
            if (currentUserMembership == null)
                return Forbid();

            if (currentUserMembership.Role == Role.Viewer)
                return Forbid("Viewers cannot modify list columns");

            List<ItemPosition>? updatedPositions = await _listColumnRepository.UpdateListColumnPositionAsync(request.ListColumnID, request.NewPosition);
            if (updatedPositions == null)
            {
                _logger.LogError("Failed to update position for list column {ListColumnID}", request.ListColumnID);
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to update list column position");
            }

            bool sentNotification = await _notificationService.SendToBoardAsync(listColumn.BoardID,
                new ColumnMovedNotification()
                {
                    SenderUserID = currentUserID,
                    BoardID = listColumn.BoardID,
                    ColumnsPositions = updatedPositions
                });

            return Ok(new UpdateListColumnPositionResponse
            {
                UpdatedColumns = updatedPositions
            });
        }
    }
}
