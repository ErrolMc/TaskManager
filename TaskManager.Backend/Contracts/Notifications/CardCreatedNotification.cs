namespace TaskManager.Backend.Contracts.Notifications
{
    public class CardCreatedNotification : Notification
    {
        public override NotificationType NotificationType => NotificationType.CardCreated;

        public string BoardID { get; set; } = string.Empty;
        public string ColumnID { get; set; } = string.Empty;
        public string CardID { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }
}
