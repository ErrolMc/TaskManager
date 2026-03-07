namespace TaskManager.Backend.Contracts.Boards
{
    public class CreateBoardRequest
    {
        public string BoardName { get; set; } = string.Empty;
        public string BoardDescription { get; set; } = string.Empty;
    }
}
