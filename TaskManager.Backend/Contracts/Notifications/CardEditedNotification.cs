namespace TaskManager.Backend.Contracts.Notifications
{
    public class CardEditedNotification : Notification
    {
        public override NotificationType NotificationType => NotificationType.CardEdited;

        public string BoardID { get; set; }
        public string CardID { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
    }
}
