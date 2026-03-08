namespace TaskManager.Backend.Contracts.Api.Boards
{
    public class CreateBoardResponse
    {
        public string BoardID { get; set; } = string.Empty;
        public string BoardName { get; set; } = string.Empty;
        public string BoardDescription { get; set; } = string.Empty;
    }
}
