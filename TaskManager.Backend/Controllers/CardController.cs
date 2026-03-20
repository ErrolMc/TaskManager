using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManager.Backend.Contracts.Api.Cards;
using TaskManager.Backend.Contracts.Notifications;
using TaskManager.Backend.Contracts.Shared;
using TaskManager.Backend.Models;
using TaskManager.Backend.Models.Enums;
using TaskManager.Backend.Repositories;
using TaskManager.Backend.Services;

namespace TaskManager.Backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/card")]
    public class CardController : BaseTaskManagerController
    {
        private readonly ILogger<CardController> _logger;
        private readonly IBoardMemberRepository _boardMemberRepository;
        private readonly IListColumnRepository _listColumnRepository;
        private readonly ICardRepository _cardRepository;
        private readonly INotificationService _notificationService;

        public CardController(
            ILogger<CardController> logger,
            IBoardMemberRepository boardMemberRepository,
            IListColumnRepository listColumnRepository,
            ICardRepository cardRepository,
            INotificationService notificationService)
        {
            _logger = logger;
            _boardMemberRepository = boardMemberRepository;
            _listColumnRepository = listColumnRepository;
            _cardRepository = cardRepository;
            _notificationService = notificationService;
        }

        [HttpPost("create")]
        [ProducesResponseType<Card>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateCard([FromBody] CreateCardRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.ColumnID))
                return BadRequest("Column ID is required");

            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest("Card title is required");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            ListColumn? listColumn = await _listColumnRepository.GetListColumnByIdAsync(request.ColumnID);
            if (listColumn == null)
                return NotFound("List column not found");

            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(listColumn.BoardID, currentUserID);
            if (currentUserMembership == null)
                return Forbid();

            if (currentUserMembership.Role == Role.Viewer)
                return Forbid("Viewers cannot modify cards");

            int nextPosition = await _cardRepository.GetNextPositionForColumnAsync(request.ColumnID);

            var card = new Card
            {
                CardID = Guid.NewGuid().ToString(),
                ColumnID = request.ColumnID,
                Title = request.Title.Trim(),
                Description = request.Description?.Trim() ?? string.Empty,
                Position = nextPosition,
                DueAtUTC = DateTime.MinValue,
                CreatedByUserID = currentUserID,
                IsArchived = false
            };

            bool cardCreated = await _cardRepository.CreateCardAsync(card);
            if (!cardCreated)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to create card");

            return Ok(card);
        }

        [HttpPost("update")]
        [ProducesResponseType<Card>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UpdateCard([FromBody] UpdateCardRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.CardID))
                return BadRequest("Card ID is required");

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest("Card title is required");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            Card? card = await _cardRepository.GetCardByIdAsync(request.CardID);
            if (card == null)
                return NotFound("Card not found");

            ListColumn? listColumn = await _listColumnRepository.GetListColumnByIdAsync(card.ColumnID);
            if (listColumn == null)
                return NotFound("List column not found");

            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(listColumn.BoardID, currentUserID);
            if (currentUserMembership == null)
                return Forbid();

            if (currentUserMembership.Role == Role.Viewer)
                return Forbid("Viewers cannot modify cards");

            bool cardUpdated = await _cardRepository.UpdateCardAsync(
                request.CardID,
                request.Name.Trim(),
                request.Description?.Trim() ?? string.Empty);

            if (!cardUpdated)
            {
                _logger.LogError("Failed to update card {CardID}", request.CardID);
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to update card");
            }

            Card? updatedCard = await _cardRepository.GetCardByIdAsync(request.CardID);
            if (updatedCard == null)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to retrieve updated card");

            bool sentNotification = await _notificationService.SendToBoardAsync(listColumn.BoardID,
                new CardEditedNotification
                {
                    SenderUserID = currentUserID,
                    BoardID = listColumn.BoardID,
                    CardID = updatedCard.CardID,
                    Title = updatedCard.Title,
                    Description = updatedCard.Description
                });

            return Ok(updatedCard);
        }

        [HttpPost("delete")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteCard([FromBody] DeleteCardRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.CardID))
                return BadRequest("Card ID is required");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            Card? card = await _cardRepository.GetCardByIdAsync(request.CardID);
            if (card == null)
                return NotFound("Card not found");

            ListColumn? listColumn = await _listColumnRepository.GetListColumnByIdAsync(card.ColumnID);
            if (listColumn == null)
                return NotFound("List column not found");

            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(listColumn.BoardID, currentUserID);
            if (currentUserMembership == null)
                return Forbid();

            if (currentUserMembership.Role == Role.Viewer)
                return Forbid("Viewers cannot modify cards");

            bool cardDeleted = await _cardRepository.DeleteCardAsync(request.CardID);
            if (!cardDeleted)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to delete card");

            // send notification
            List<Card> boardCards = await _cardRepository.GetCardsForBoardAsync(listColumn.BoardID);
            List<ItemPosition> updatedCardPositions = boardCards
                .Where(c => c.ColumnID == listColumn.ColumnID)
                .OrderBy(c => c.Position)
                .ThenBy(c => c.CardID)
                .Select(c => new ItemPosition { Id = c.CardID, Position = c.Position })
                .ToList();

            bool sentNotification = await _notificationService.SendToBoardAsync(listColumn.BoardID,
                new CardDeletedNotification
                {
                    SenderUserID = currentUserID,
                    BoardID = listColumn.BoardID,
                    CardID = request.CardID,
                    ColumnArrangement = new ColumnArrangement
                    {
                        ListColumnID = listColumn.ColumnID,
                        CardsPositions = updatedCardPositions
                    }
                });

            return Ok("Card deleted successfully");
        }

        [HttpPost("updateposition")]
        [ProducesResponseType<UpdateCardPositionResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UpdateCardPosition([FromBody] UpdateCardPositionRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.CardID))
                return BadRequest("Card ID is required");

            if (string.IsNullOrWhiteSpace(request.ListColumnID))
                return BadRequest("List column ID is required");

            if (request.NewPosition < 0)
                return BadRequest("New position must be greater than or equal to 0");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            Card? card = await _cardRepository.GetCardByIdAsync(request.CardID);
            if (card == null)
                return NotFound("Card not found");

            ListColumn? currentColumn = await _listColumnRepository.GetListColumnByIdAsync(card.ColumnID);
            if (currentColumn == null)
                return NotFound("Current list column not found");

            ListColumn? targetColumn = await _listColumnRepository.GetListColumnByIdAsync(request.ListColumnID);
            if (targetColumn == null)
                return NotFound("Target list column not found");

            if (currentColumn.BoardID != targetColumn.BoardID)
                return BadRequest("Cards can only be moved within the same board");

            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(currentColumn.BoardID, currentUserID);
            if (currentUserMembership == null)
                return Forbid();

            if (currentUserMembership.Role == Role.Viewer)
                return Forbid("Viewers cannot modify cards");

            string sourceColumnID = card.ColumnID;
            bool isMovedWithinSameColumn = sourceColumnID == request.ListColumnID;

            List<ColumnArrangement>? updatedColumns = await _cardRepository.UpdateCardPositionAsync(
                request.CardID,
                request.ListColumnID,
                request.NewPosition);

            if (updatedColumns == null)
            {
                _logger.LogError("Failed to update position for card {CardID}", request.CardID);
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to update card position");
            }

            ColumnArrangement sourceColumnArrangement = updatedColumns
                .FirstOrDefault(c => c.ListColumnID == sourceColumnID)
                ?? updatedColumns[0];

            ColumnArrangement? targetColumnArrangement = isMovedWithinSameColumn
                ? null
                : updatedColumns.FirstOrDefault(c => c.ListColumnID == request.ListColumnID);

            bool sentNotification = await _notificationService.SendToBoardAsync(currentColumn.BoardID,
                new CardMovedNotification
                {
                    SenderUserID = currentUserID,
                    BoardID = currentColumn.BoardID,
                    CardID = request.CardID,
                    IsMovedWithinSameColumn = isMovedWithinSameColumn,
                    SourceColumnArrangement = sourceColumnArrangement,
                    TargetColumnArrangement = targetColumnArrangement
                });

            return Ok(new UpdateCardPositionResponse
            {
                AdjustedColumns = updatedColumns
            });
        }
    }
}
