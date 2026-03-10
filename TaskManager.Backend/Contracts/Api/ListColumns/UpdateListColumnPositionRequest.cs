namespace TaskManager.Backend.Contracts.Api.ListColumns
{
    public class UpdateListColumnPositionRequest
    {
        public string ListColumnID { get; set; } = string.Empty;
        public int NewPosition { get; set; }
    }
}
