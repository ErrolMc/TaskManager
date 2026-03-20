namespace TaskManager.Backend.Contracts.Notifications
{
    public class BoardLeftNotification : Notification
    {
        public override NotificationType NotificationType => NotificationType.BoardLeft;

        public string BoardID { get; set; } = string.Empty;
        public string UserID { get; set; } = string.Empty;
    }
}
