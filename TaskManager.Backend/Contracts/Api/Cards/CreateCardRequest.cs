namespace TaskManager.Backend.Contracts.Api.Cards
{
    public class CreateCardRequest
    {
        public string ColumnID { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }
}
