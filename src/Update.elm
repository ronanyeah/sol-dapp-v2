module Update exposing (update)

import Ports
import Types exposing (Model, Msg(..))


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        FileCb val ->
            ( model, Ports.fileOut val )

        Airdrop ->
            ( model, Ports.airdrop () )

        ExportKeys ->
            ( model
            , Ports.exportKeys ()
            )

        RefreshBalance ->
            ( model
            , Ports.refreshBalance ()
            )

        KeysCb ks ->
            ( { model
                | keys = Just ks
              }
            , Cmd.none
            )

        Logout ->
            ( { model
                | pubkey = Nothing
                , balance = Nothing
                , keys = Nothing
              }
            , Ports.logout ()
            )

        GenerateKeys ->
            ( model
            , Ports.generateKey ()
            )

        SendTx simulate ->
            model.amount
                |> String.toFloat
                |> Maybe.map
                    (\amt ->
                        ( model
                        , Ports.sendTx
                            { recipient = model.recipient
                            , simulate = simulate
                            , amount =
                                1000000000
                                    * amt
                                    |> round
                            }
                        )
                    )
                |> Maybe.withDefault ( model, Cmd.none )

        AmountChg data ->
            ( { model
                | amount = data
              }
            , Cmd.none
            )

        RecipientChg data ->
            ( { model
                | recipient = data
              }
            , Cmd.none
            )

        BalanceCb data ->
            ( { model
                | balance = Just data
              }
            , Cmd.none
            )

        PubkeyCb data ->
            ( { model
                | pubkey = Just data.addr
                , balance = Nothing
                , recipient = ""
                , amount = ""
                , exportable = data.exportable
              }
            , Cmd.none
            )
