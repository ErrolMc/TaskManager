namespace TaskManager.Backend.Contracts.Notifications
{
    public class CardCreatedNotification : Notification
    {
        public override NotificationType NotificationType => NotificationType.CardCreated;


    }
}
