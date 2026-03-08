using TaskManager.Backend.Contracts.Notifications;

namespace TaskManager.Backend.Services
{
    public interface INotificationService
    {
        public Task SendToUserAsync(string userID, NotificationType notificationType, object payload);
        public Task SendToUsersAsync(IEnumerable<string> userIDs, NotificationType notificationType, object payload);
    }
}
