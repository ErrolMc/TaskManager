using TaskManager.Backend.Contracts.Shared;

namespace TaskManager.Backend.Contracts.Notifications
{
    public class CardMovedNotification : Notification
    {
        public override NotificationType NotificationType => NotificationType.CardMoved;

        public string BoardID { get; set; } = string.Empty;
        public string CardID { get; set; } = string.Empty;
        public bool IsMovedWithinSameColumn { get; set; }
        public ColumnArrangement SourceColumnArrangement { get; set; } = null!;
        public ColumnArrangement? TargetColumnArrangement { get; set; } = null;
    }
}
