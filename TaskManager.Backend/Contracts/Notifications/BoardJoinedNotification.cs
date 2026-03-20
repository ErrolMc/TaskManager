namespace TaskManager.Backend.Contracts.Notifications
{
    public class BoardJoinedNotification : Notification
    {
        public override NotificationType NotificationType => NotificationType.BoardJoined;

        public string BoardID { get; set; } = string.Empty;
        public string UserID { get; set; } = string.Empty;
    }
}
