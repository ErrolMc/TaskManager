namespace TaskManager.Backend.Contracts.Notifications
{
    public enum NotificationType
    {
        None = 0,
        CardMoved = 1,
        ColumnMoved = 2,
        ColumnDeleted = 3,
        CardDeleted = 4,
        ColumnEdited = 5,
        CardEdited = 6,
        ColumnCreated = 7,
        CardCreated = 8,
        BoardJoined = 9,
        BoardLeft = 10,
        BoardDeleted = 11,
    }
}
