using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManager.Backend.Contracts.Api.Boards;
using TaskManager.Backend.Contracts.Notifications;
using TaskManager.Backend.Models;
using TaskManager.Backend.Models.DTOs;
using TaskManager.Backend.Models.Enums;
using TaskManager.Backend.Repositories;
using TaskManager.Backend.Services;

namespace TaskManager.Backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/board")]
    public class BoardController : BaseTaskManagerController
    {
        private readonly ILogger<BoardController> _logger;
        private readonly IBoardRepository _boardRepository;
        private readonly IBoardMemberRepository _boardMemberRepository;
        private readonly IListColumnRepository _listColumnRepository;
        private readonly ICardRepository _cardRepository;
        private readonly IUserRepository _userRepository;
        private readonly INotificationService _notificationService;

        public BoardController(
            ILogger<BoardController> logger,
            IBoardRepository boardRepository,
            IBoardMemberRepository boardMemberRepository,
            IListColumnRepository listColumnRepository,
            ICardRepository cardRepository,
            IUserRepository userRepository,
            INotificationService notificationService)
        {
            _logger = logger;
            _boardRepository = boardRepository;
            _boardMemberRepository = boardMemberRepository;
            _listColumnRepository = listColumnRepository;
            _cardRepository = cardRepository;
            _userRepository = userRepository;
            _notificationService = notificationService;
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

        [HttpPost("adduser")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> AddUserToBoard([FromBody] AddUserToBoardRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.BoardID))
                return BadRequest("Board ID is required");

            if (string.IsNullOrWhiteSpace(request.Username))
                return BadRequest("Username is required");

            if (!Enum.IsDefined(request.Role))
                return BadRequest("Invalid board role");

            if (request.Role == Role.Owner)
                return BadRequest("Use ownership transfer flow to assign owner role");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            Board? board = await _boardRepository.GetBoardByIdAsync(request.BoardID);
            if (board == null)
                return NotFound("Board not found");

            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(request.BoardID, currentUserID);
            bool canManageMembers = board.OwnerUserID == currentUserID
                || currentUserMembership?.Role == Role.Owner
                || currentUserMembership?.Role == Role.Admin;

            if (!canManageMembers)
                return Forbid();

            if (currentUserMembership?.Role == Role.Admin && (request.Role == Role.Admin || request.Role == Role.Owner))
                return Forbid("Admins cannot assign admin/owner role to other users");

            User? userToAdd = await _userRepository.GetUserByUsernameAsync(request.Username);
            if (userToAdd == null)
                return NotFound("User not found");

            BoardMember? existingMembership = await _boardMemberRepository.GetBoardMemberAsync(request.BoardID, userToAdd.UserID);
            if (existingMembership != null)
                return Conflict("User is already a board member");

            var boardMember = new BoardMember
            {
                BoardID = request.BoardID,
                UserID = userToAdd.UserID,
                Role = request.Role,
                JoinedAtUTC = DateTime.UtcNow
            };

            bool boardMemberCreated = await _boardMemberRepository.CreateBoardMemberAsync(boardMember);
            if (!boardMemberCreated)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to add user to board");

            // send notification to user and the board
            Notification notification = new BoardJoinedNotification
            {
                SenderUserID = currentUserID,
                BoardID = request.BoardID,
                UserID = userToAdd.UserID
            };

            bool sentNotification = await _notificationService.SendToUserAsync(userToAdd.UserID, notification);
            sentNotification = await _notificationService.SendToBoardAsync(request.BoardID, notification);

            return Ok("User added to board successfully");
        }

        [HttpPost("removeuser")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> RemoveUserFromBoard([FromBody] RemoveUserFromBoardRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.BoardID))
                return BadRequest("Board ID is required");

            if (string.IsNullOrWhiteSpace(request.UserID))
                return BadRequest("User ID is required");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            Board? board = await _boardRepository.GetBoardByIdAsync(request.BoardID);
            if (board == null)
                return NotFound("Board not found");

            BoardMember? targetMembership = await _boardMemberRepository.GetBoardMemberAsync(request.BoardID, request.UserID);
            if (targetMembership == null)
                return NotFound("Board member not found");

            if (board.OwnerUserID == request.UserID || targetMembership.Role == Role.Owner)
                return BadRequest("Cannot remove the board owner");

            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(request.BoardID, currentUserID);
            bool canRemoveMember = currentUserID == request.UserID
                || board.OwnerUserID == currentUserID
                || currentUserMembership?.Role == Role.Owner
                || currentUserMembership?.Role == Role.Admin;

            if (!canRemoveMember)
                return Forbid();

            bool boardMemberDeleted = await _boardMemberRepository.DeleteBoardMemberAsync(request.BoardID, request.UserID);
            if (!boardMemberDeleted)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to remove user from board");

            // send notification to user and the board
            Notification notification = new BoardLeftNotification
            {
                SenderUserID = currentUserID,
                BoardID = request.BoardID,
                UserID = request.UserID
            };

            bool sentNotification = await _notificationService.SendToUserAsync(request.UserID, notification);
            sentNotification = await _notificationService.SendToBoardAsync(request.BoardID, notification);

            return Ok("User removed from board successfully");
        }

        [HttpGet("getboardinfo")]
        [ProducesResponseType<GetBoardInfoResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetBoardInfo([FromQuery] GetBoardInfoRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.BoardID))
                return BadRequest("Board ID is required");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            Board? board = await _boardRepository.GetBoardByIdAsync(request.BoardID);
            if (board == null)
                return NotFound("Board not found");

            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(request.BoardID, currentUserID);
            if (currentUserMembership == null)
                return Forbid();

            List<BoardMember> members = await _boardMemberRepository.GetBoardMembersAsync(request.BoardID);
            List<ListColumn> listColumns = await _listColumnRepository.GetListColumnsForBoardAsync(request.BoardID);
            List<Card> cards = await _cardRepository.GetCardsForBoardAsync(request.BoardID);
            var cardsByColumnID = cards
                .GroupBy(c => c.ColumnID)
                .ToDictionary(
                    group => group.Key,
                    group => group.OrderBy(c => c.Position).ThenBy(c => c.CardID).ToList());

            var response = new GetBoardInfoResponse()
            {
                BoardInfo = new BoardInfoDTO()
                {
                    BoardID = board.ID,
                    BoardName = board.Name,
                    Description = board.Description,
                    CreatedAtUTC = board.CreatedAtUTC,
                    UpdatedAtUTC = board.UpdatedAtUTC,
                },
                Members = members.Select(m => new BoardMemberDTO
                {
                    User = m.User.AsUserDTO(),
                    Role = m.Role
                }).ToList(),
                ListColumns = listColumns.Select(listColumn => new BoardListColumnDTO
                {
                    ColumnID = listColumn.ColumnID,
                    BoardID = listColumn.BoardID,
                    Name = listColumn.Name,
                    Position = listColumn.Position,
                    CreatedAtUTC = listColumn.CreatedAtUTC,
                    UpdatedAtUTC = listColumn.UpdatedAtUTC,
                    Cards = cardsByColumnID.TryGetValue(listColumn.ColumnID, out List<Card>? columnCards)
                        ? columnCards.Select(card => new BoardCardDTO
                        {
                            CardID = card.CardID,
                            ColumnID = card.ColumnID,
                            Title = card.Title,
                            Description = card.Description,
                            Position = card.Position,
                            DueAtUTC = card.DueAtUTC,
                            CreatedByUserID = card.CreatedByUserID,
                            IsArchived = card.IsArchived
                        }).ToList()
                        : []
                }).ToList()
            };

            return Ok(response);
        }

        [HttpGet("getboardmembers")]
        [ProducesResponseType<List<BoardMemberDTO>>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetBoardMembers([FromQuery] GetBoardInfoRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.BoardID))
                return BadRequest("Board ID is required");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            Board? board = await _boardRepository.GetBoardByIdAsync(request.BoardID);
            if (board == null)
                return NotFound("Board not found");

            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(request.BoardID, currentUserID);
            if (currentUserMembership == null)
                return Forbid();

            List<BoardMember> members = await _boardMemberRepository.GetBoardMembersAsync(request.BoardID);

            var response = members.Select(m => new BoardMemberDTO
            {
                User = m.User.AsUserDTO(),
                Role = m.Role
            }).ToList();

            return Ok(response);
        }

        [HttpGet("getboardsforcurrentuser")]
        [ProducesResponseType<List<BoardInfoDTO>>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetBoardsForCurrentUser()
        {
            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            List<BoardMember> memberships = await _boardMemberRepository.GetBoardMembershipsForUserAsync(currentUserID);

            var boards = memberships.Select(m => new BoardInfoDTO
            {
                BoardID = m.BoardID,
                BoardName = m.Board.Name,
                Description = m.Board.Description,
                CreatedAtUTC = m.Board.CreatedAtUTC,
                UpdatedAtUTC = m.Board.UpdatedAtUTC
            }).ToList();

            return Ok(boards);
        }

        [HttpPost("changerole")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ChangeBoardMemberRole([FromBody] ChangeBoardMemberRoleRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.BoardID))
                return BadRequest("Board ID is required");

            if (string.IsNullOrWhiteSpace(request.UserID))
                return BadRequest("User ID is required");

            if (!Enum.IsDefined(request.NewRole))
                return BadRequest("Invalid board role");

            if (request.NewRole == Role.Owner)
                return BadRequest("Use ownership transfer flow to assign owner role");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            Board? board = await _boardRepository.GetBoardByIdAsync(request.BoardID);
            if (board == null)
                return NotFound("Board not found");

            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(request.BoardID, currentUserID);
            bool canManageMembers = board.OwnerUserID == currentUserID
                || currentUserMembership?.Role == Role.Owner
                || currentUserMembership?.Role == Role.Admin;

            if (!canManageMembers)
                return Forbid();

            if (currentUserMembership?.Role == Role.Admin && (request.NewRole == Role.Admin || request.NewRole == Role.Owner))
                return Forbid("Admins cannot assign admin role to other users");

            BoardMember? targetMembership = await _boardMemberRepository.GetBoardMemberAsync(request.BoardID, request.UserID);
            if (targetMembership == null)
                return NotFound("Board member not found");

            if (targetMembership.Role == Role.Owner)
                return BadRequest("Cannot change the role of the board owner");

            if (currentUserMembership?.Role == Role.Admin && targetMembership.Role == Role.Admin)
                return Forbid("Admins cannot change the role of other admins");

            bool roleUpdated = await _boardMemberRepository.UpdateBoardMemberRoleAsync(request.BoardID, request.UserID, request.NewRole);
            if (!roleUpdated)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to update board member role");

            return Ok("Board member role updated successfully");
        }
    }
}
