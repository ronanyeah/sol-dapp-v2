module Types exposing (Flags, Model, Msg(..))

import Json.Decode exposing (Value)


type alias Model =
    { pubkey : Maybe String
    , exportable : Bool
    , balance : Maybe Int
    , recipient : String
    , amount : String
    , keys : Maybe Value
    }


type alias Flags =
    {}


type Msg
    = FileCb Value
    | PubkeyCb { addr : String, exportable : Bool }
    | SendTx Bool
    | Logout
    | Airdrop
    | ExportKeys
    | GenerateKeys
    | RefreshBalance
    | BalanceCb Int
    | RecipientChg String
    | AmountChg String
    | KeysCb Value
