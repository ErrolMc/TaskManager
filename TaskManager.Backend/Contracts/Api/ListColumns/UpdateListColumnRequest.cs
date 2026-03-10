namespace TaskManager.Backend.Contracts.Api.ListColumns
{
    public class UpdateListColumnRequest
    {
        public string ListColumnID { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }
}
