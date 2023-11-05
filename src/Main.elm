module Main exposing (main)

import Browser
import Ports
import Types exposing (..)
import Update exposing (update)
import View exposing (view)


main : Program Flags Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


init : Flags -> ( Model, Cmd Msg )
init _ =
    ( { pubkey = Nothing
      , balance = Nothing
      , keys = Nothing
      , recipient = ""
      , amount = ""
      , exportable = False
      }
    , Cmd.none
    )


subscriptions : Model -> Sub Msg
subscriptions _ =
    [ Ports.pubkeyCb PubkeyCb
    , Ports.balanceCb BalanceCb
    , Ports.keysCb KeysCb
    ]
        |> Sub.batch
