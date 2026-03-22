namespace TaskManager.Backend.Contracts.Notifications
{
    public class CardMessageDeletedNotification : Notification
    {
        public override NotificationType NotificationType => NotificationType.CardMessageDeleted;

        public string BoardID { get; set; } = string.Empty;
        public string CardID { get; set; } = string.Empty;
        public string CardMessageID { get; set; } = string.Empty;
    }
}
