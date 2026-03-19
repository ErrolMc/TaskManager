using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.JsonWebTokens;
using TaskManager.Backend.Repositories;
using TaskManager.Backend.Services;

namespace TaskManager.Backend.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        private const string JoinedBoardsKey = "joined-boards";
        private readonly IBoardMemberRepository _boardMemberRepository;
        private readonly INotificationService _notificationService;

        public NotificationHub(IBoardMemberRepository boardMemberRepository, INotificationService notificationService)
        {
            _boardMemberRepository = boardMemberRepository;
            _notificationService = notificationService;
        }

        public async Task JoinBoardAsync(string boardID)
        {
            if (string.IsNullOrWhiteSpace(boardID))
                throw new HubException("Board ID is required");

            string trimmedBoardID = boardID.Trim();

            string? currentUserID = GetCurrentUserID();
            if (string.IsNullOrWhiteSpace(currentUserID))
                throw new HubException("Unable to resolve authenticated user");

            var membership = await _boardMemberRepository.GetBoardMemberAsync(trimmedBoardID, currentUserID);
            if (membership == null)
                throw new HubException("Forbidden");

            HashSet<string> joinedBoards = GetOrCreateJoinedBoards();
            if (joinedBoards.Add(trimmedBoardID))
            {
                await _notificationService.JoinBoardGroupAsync(Context.ConnectionId, trimmedBoardID);
            }
        }

        public async Task LeaveBoardAsync(string boardID)
        {
            if (string.IsNullOrWhiteSpace(boardID))
                throw new HubException("Board ID is required");

            string trimmedBoardID = boardID.Trim();
            HashSet<string> joinedBoards = GetOrCreateJoinedBoards();

            if (joinedBoards.Remove(trimmedBoardID))
            {
                await _notificationService.LeaveBoardGroupAsync(Context.ConnectionId, trimmedBoardID);
            }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            HashSet<string> joinedBoards = GetOrCreateJoinedBoards();
            foreach (string boardID in joinedBoards)
            {
                await _notificationService.LeaveBoardGroupAsync(Context.ConnectionId, boardID);
            }

            joinedBoards.Clear();
            await base.OnDisconnectedAsync(exception);
        }

        private string? GetCurrentUserID()
        {
            return Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? Context.User?.FindFirstValue("sub")
                ?? Context.UserIdentifier;
        }

        private HashSet<string> GetOrCreateJoinedBoards()
        {
            if (Context.Items.TryGetValue(JoinedBoardsKey, out var value)
                && value is HashSet<string> existing)
            {
                return existing;
            }

            var joinedBoards = new HashSet<string>(StringComparer.Ordinal);
            Context.Items[JoinedBoardsKey] = joinedBoards;
            return joinedBoards;
        }
    }
}
