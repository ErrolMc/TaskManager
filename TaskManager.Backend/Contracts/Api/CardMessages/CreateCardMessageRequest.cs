namespace TaskManager.Backend.Contracts.Api.CardMessages
{
    public class CreateCardMessageRequest
    {
        public string BoardID { get; set; } = string.Empty;
        public string CardID { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}