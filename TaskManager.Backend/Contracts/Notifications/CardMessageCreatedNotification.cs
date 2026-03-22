namespace TaskManager.Backend.Contracts.Notifications
{
    public class CardMessageCreatedNotification : Notification
    {
        public override NotificationType NotificationType => NotificationType.CardMessageCreated;

        public string BoardID { get; set; } = string.Empty;
        public string CardID { get; set; } = string.Empty;
        public string CardMessageID { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
