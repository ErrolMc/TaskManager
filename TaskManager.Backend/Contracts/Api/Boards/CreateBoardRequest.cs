namespace TaskManager.Backend.Contracts.Api.Boards
{
    public class CreateBoardRequest
    {
        public string BoardName { get; set; } = string.Empty;
        public string BoardDescription { get; set; } = string.Empty;
    }
}
