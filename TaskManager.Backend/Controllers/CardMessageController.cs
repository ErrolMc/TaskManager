using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskManager.Backend.Contracts.Api.CardMessages;
using TaskManager.Backend.Contracts.Notifications;
using TaskManager.Backend.Data;
using TaskManager.Backend.Models;
using TaskManager.Backend.Models.Enums;
using TaskManager.Backend.Repositories;
using TaskManager.Backend.Services;

namespace TaskManager.Backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/cardmessage")]
    public class CardMessageController : BaseTaskManagerController
    {
        private readonly AppDbContext _dbContext;
        private readonly IBoardMemberRepository _boardMemberRepository;
        private readonly IListColumnRepository _listColumnRepository;
        private readonly ICardRepository _cardRepository;
        private readonly INotificationService _notificationService;

        public CardMessageController(
            AppDbContext dbContext,
            IBoardMemberRepository boardMemberRepository,
            IListColumnRepository listColumnRepository,
            ICardRepository cardRepository,
            INotificationService notificationService)
        {
            _dbContext = dbContext;
            _boardMemberRepository = boardMemberRepository;
            _listColumnRepository = listColumnRepository;
            _cardRepository = cardRepository;
            _notificationService = notificationService;
        }

        [HttpPost("create")]
        [ProducesResponseType<CardMessage>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateCardMessage([FromBody] CreateCardMessageRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.BoardID))
                return BadRequest("Board ID is required");

            if (string.IsNullOrWhiteSpace(request.CardID))
                return BadRequest("Card ID is required");

            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest("Message is required");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(request.BoardID, currentUserID);
            if (currentUserMembership == null)
                return Forbid();

            if (currentUserMembership.Role == Role.Viewer)
                return Forbid("Viewers cannot create card messages");

            Card? card = await _cardRepository.GetCardByIdAsync(request.CardID);
            if (card == null)
                return NotFound("Card not found");

            ListColumn? listColumn = await _listColumnRepository.GetListColumnByIdAsync(card.ColumnID);
            if (listColumn == null)
                return NotFound("List column not found");

            if (!string.Equals(listColumn.BoardID, request.BoardID, StringComparison.Ordinal))
                return BadRequest("Card does not belong to the provided board");

            var cardMessage = new CardMessage
            {
                MessageID = Guid.NewGuid().ToString(),
                CardID = request.CardID,
                Message = request.Message.Trim(),
                SenderUserID = currentUserID,
                CreateTimeUTC = DateTime.UtcNow
            };

            _dbContext.CardMessages.Add(cardMessage);
            bool saved = await _dbContext.SaveChangesAsync() > 0;
            if (!saved)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to create card message");

            bool sentNotification = await _notificationService.SendToBoardAsync(request.BoardID,
                new CardMessageCreatedNotification
                {
                    SenderUserID = currentUserID,
                    BoardID = request.BoardID,
                    CardID = request.CardID,
                    CardMessageID = cardMessage.MessageID,
                    Message = cardMessage.Message,
                });

            return Ok(cardMessage);
        }

        [HttpPost("delete")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteCardMessage([FromBody] DeleteCardMessageRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.BoardID))
                return BadRequest("Board ID is required");

            if (string.IsNullOrWhiteSpace(request.CardMessageID))
                return BadRequest("Card message ID is required");

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                return Unauthorized("Unable to resolve authenticated user");

            BoardMember? currentUserMembership = await _boardMemberRepository.GetBoardMemberAsync(request.BoardID, currentUserID);
            if (currentUserMembership == null)
                return Forbid();

            if (currentUserMembership.Role == Role.Viewer)
                return Forbid("Viewers cannot delete card messages");

            CardMessage? cardMessage = await _dbContext.CardMessages
                .FirstOrDefaultAsync(message => message.MessageID == request.CardMessageID);
            if (cardMessage == null)
                return NotFound("Card message not found");

            Card? card = await _cardRepository.GetCardByIdAsync(cardMessage.CardID);
            if (card == null)
                return NotFound("Card not found");

            ListColumn? listColumn = await _listColumnRepository.GetListColumnByIdAsync(card.ColumnID);
            if (listColumn == null)
                return NotFound("List column not found");

            if (!string.Equals(listColumn.BoardID, request.BoardID, StringComparison.Ordinal))
                return BadRequest("Card message does not belong to the provided board");

            _dbContext.CardMessages.Remove(cardMessage);
            bool saved = await _dbContext.SaveChangesAsync() > 0;
            if (!saved)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to delete card message");

            bool sentNotification = await _notificationService.SendToBoardAsync(request.BoardID,
                new CardMessageDeletedNotification
                {
                    SenderUserID = currentUserID,
                    BoardID = request.BoardID,
                    CardID = card.CardID,
                    CardMessageID = cardMessage.MessageID
                });

            return Ok("Card message deleted successfully");
        }
    }
}
