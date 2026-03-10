namespace TaskManager.Backend.Contracts.Api.ListColumns
{
    public class CreateListColumnRequest
    {
        public string BoardID { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }
}
