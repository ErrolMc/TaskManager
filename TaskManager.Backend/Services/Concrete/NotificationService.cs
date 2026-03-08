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

        public async Task SendToUserAsync(string userID, NotificationType notificationType, object payload)
        {
            ArgumentNullException.ThrowIfNull(payload);

            if (string.IsNullOrWhiteSpace(userID))
                throw new ArgumentException("User ID is required", nameof(userID));

            await _notificationHubContext.Clients.User(userID).SendAsync(notificationType.ToString(), payload);
        }

        public async Task SendToUsersAsync(IEnumerable<string> userIDs, NotificationType notificationType, object payload)
        {
            ArgumentNullException.ThrowIfNull(userIDs);
            ArgumentNullException.ThrowIfNull(payload);

            string[] targetUserIDs = userIDs
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct()
                .ToArray();

            if (targetUserIDs.Length == 0)
                throw new ArgumentException("At least one valid user ID is required", nameof(userIDs));

            await _notificationHubContext.Clients.Users(targetUserIDs).SendAsync(notificationType.ToString(), payload);
        }
    }
}
