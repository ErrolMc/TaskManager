using Microsoft.AspNetCore.SignalR;
using TaskManager.Backend.Contracts.Notifications;
using TaskManager.Backend.Hubs;

namespace TaskManager.Backend.Services.Concrete
{
    public class NotificationService : INotificationService
    {
        private readonly IHubContext<NotificationHub> _notificationHubContext;

        public NotificationService(IHubContext<NotificationHub> notificationHubContext)
        {
            _notificationHubContext = notificationHubContext;
        }

        public async Task JoinBoardGroupAsync(string connectionID, string boardID)
        {
            if (string.IsNullOrWhiteSpace(connectionID))
                throw new ArgumentException("Connection ID is required", nameof(connectionID));

            string boardGroupName = BuildBoardGroupName(boardID);
            await _notificationHubContext.Groups.AddToGroupAsync(connectionID, boardGroupName);
        }

        public async Task LeaveBoardGroupAsync(string connectionID, string boardID)
        {
            if (string.IsNullOrWhiteSpace(connectionID))
                throw new ArgumentException("Connection ID is required", nameof(connectionID));

            string boardGroupName = BuildBoardGroupName(boardID);
            await _notificationHubContext.Groups.RemoveFromGroupAsync(connectionID, boardGroupName);
        }

        public async Task<bool> SendToBoardAsync(string boardID, Notification payload)
        {
            if (payload is null || string.IsNullOrWhiteSpace(boardID))
                return false;

            string boardGroupName = BuildBoardGroupName(boardID);
            await _notificationHubContext.Clients.Group(boardGroupName).SendAsync(payload.NotificationType.ToString(), payload);
            return true;
        }

        public async Task<bool> SendToUserAsync(string userID, Notification payload)
        {
            if (payload is null || string.IsNullOrWhiteSpace(userID))
                return false;

            await _notificationHubContext.Clients.User(userID.Trim()).SendAsync(payload.NotificationType.ToString(), payload);
            return true;
        }

        private static string BuildBoardGroupName(string boardID)
        {
            if (string.IsNullOrWhiteSpace(boardID))
                throw new ArgumentException("Board ID is required", nameof(boardID));

            return $"board:{boardID.Trim()}";
        }
    }
}
