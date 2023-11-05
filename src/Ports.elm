port module Ports exposing (..)

import Json.Decode exposing (Value)



-- OUT


port log : String -> Cmd msg


port fileOut : Value -> Cmd msg


port sendTx : { recipient : String, amount : Int, simulate : Bool } -> Cmd msg


port generateKey : () -> Cmd msg


port refreshBalance : () -> Cmd msg


port logout : () -> Cmd msg


port exportKeys : () -> Cmd msg


port airdrop : () -> Cmd msg



-- IN


port pubkeyCb : ({ addr : String, exportable : Bool } -> msg) -> Sub msg


port balanceCb : (Int -> msg) -> Sub msg


port keysCb : (Value -> msg) -> Sub msg
