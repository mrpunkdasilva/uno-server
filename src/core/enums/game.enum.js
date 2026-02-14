export const GameStatus = {
  WAITING: 'Waiting',
  ACTIVE: 'Active',
  PAUSE: 'Pause',
  ENDED: 'Ended',
};

export const PostAbandonmentAction = {
  END_GAME_WITH_WINNER: 'END_GAME_WITH_WINNER',
  END_GAME_NO_WINNER: 'END_GAME_NO_WINNER',
  SAVE_GAME: 'SAVE_GAME',
};

export const PostPlayAction = {
  END_GAME_WITH_WINNER: 'END_GAME_WITH_WINNER',
  CONTINUE_GAME: 'CONTINUE_GAME',
};
