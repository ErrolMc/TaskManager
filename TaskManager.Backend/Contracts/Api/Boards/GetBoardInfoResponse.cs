using TaskManager.Backend.Models.DTOs;

namespace TaskManager.Backend.Contracts.Api.Boards
{
    public class GetBoardInfoResponse
    {
        public BoardInfoDTO BoardInfo { get; set; } = null!;
        public List<BoardMemberDTO> Members { get; set; } = [];
        // cards
    }
}
