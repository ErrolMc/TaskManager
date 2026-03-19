using TaskManager.Backend.Contracts.Notifications;

namespace TaskManager.Backend.Services
{
    public interface INotificationService
    {
        public Task JoinBoardGroupAsync(string connectionID, string boardID);
        public Task LeaveBoardGroupAsync(string connectionID, string boardID);

        public Task<bool> SendToBoardAsync(string boardID, Notification payload);
    }
}
