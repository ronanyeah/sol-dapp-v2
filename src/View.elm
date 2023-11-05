module View exposing (view)

import Element exposing (..)
import Element.Background as Background
import Element.Border as Border
import Element.Font as Font
import Element.Input as Input
import Html exposing (Html)
import Html.Attributes
import Html.Events
import Json.Decode as JD
import Json.Encode as JE
import Types exposing (..)
import Url


view : Model -> Html Msg
view model =
    [ [ text "Solana SDK v2 Demo"
            |> el [ Font.bold, Font.size 25 ]
      , [ newTabLink [ Font.underline ]
            { url = "https://github.com/solana-labs/solana-web3.js/tree/master/packages/library"
            , label = text "SDK docs"
            }
        , newTabLink [ Font.underline ]
            { url = "https://github.com/ronanyeah/sol-dapp-v2"
            , label = text "Demo source code"
            }
        ]
            |> row [ spacing 20 ]
      ]
        |> column [ spacing 10 ]
    , model.pubkey
        |> Maybe.map
            (\addr ->
                [ [ text "Wallet Loaded"
                        |> el [ Font.bold ]
                  , newTabLink
                        [ Html.Attributes.title addr
                            |> htmlAttribute
                        , hover
                        , Font.underline
                        ]
                        { url = "https://solscan.io/account/" ++ addr ++ "?cluster=devnet"
                        , label =
                            text
                                (String.left 12 addr ++ "..." ++ String.right 12 addr)
                        }
                  , model.balance
                        |> Maybe.map
                            (\bal ->
                                ("Balance: "
                                    ++ (toFloat bal
                                            / 1000000000
                                            |> String.fromFloat
                                       )
                                    ++ " SOL (devnet)"
                                )
                                    |> text
                            )
                        |> Maybe.withDefault none
                  , [ btn RefreshBalance "Refresh"
                    , btn Airdrop "Request airdrop"
                    ]
                        |> row [ spacing 20 ]
                  ]
                    |> column
                        [ width fill
                        , spacing 20
                        , Border.width 2
                        , padding 20
                        ]
                , [ text "SOL Transfer"
                        |> el [ Font.bold ]
                  , Input.text []
                        { label = Input.labelHidden ""
                        , onChange = RecipientChg
                        , text = model.recipient
                        , placeholder =
                            text "Recipient"
                                |> Input.placeholder []
                                |> Just
                        }
                  , Input.text []
                        { label = Input.labelHidden ""
                        , onChange = AmountChg
                        , text = model.amount
                        , placeholder =
                            text "Amount (SOL)"
                                |> Input.placeholder []
                                |> Just
                        }
                  , [ btn (SendTx False) "Send"
                    , btn (SendTx True) "Simulate"
                    ]
                        |> row [ spacing 20 ]
                  ]
                    |> column
                        [ width fill
                        , spacing 20
                        , Border.width 2
                        , padding 20
                        ]
                , [ model.keys
                        |> Maybe.map
                            (\keys ->
                                downloadAs
                                    [ Border.width 1
                                    , hover
                                    , padding 10
                                    ]
                                    { label = text "Download private key"
                                    , filename = addr ++ ".json"
                                    , url =
                                        keys
                                            |> JE.encode 0
                                            |> Url.percentEncode
                                            |> (++) "data:text/json;charset=utf-8,"
                                    }
                            )
                        |> Maybe.withDefault (btn ExportKeys "Export private key")
                        |> (\elem ->
                                if model.exportable then
                                    elem

                                else
                                    none
                           )
                  , btn Logout "Logout"
                        |> el [ alignRight ]
                  ]
                    |> row [ width fill, spaceEvenly ]
                ]
                    |> column [ spacing 20, width fill ]
            )
        |> Maybe.withDefault
            ([ text "Generate new Solana wallet"
                |> btnFn GenerateKeys [ Border.width 2, padding 15 ]
             , [ [ text "Import a Solana private key (64 byte JSON file)" ]
                    |> paragraph []
               , Html.input
                    [ Html.Attributes.type_ "file"
                    , Html.Events.on "change"
                        (JD.map FileCb (JD.at [ "target", "files", "0" ] JD.value))
                    ]
                    []
                    |> Element.html
                    |> el []
               ]
                |> column [ spacing 20, padding 15, Border.width 2 ]
             ]
                |> column [ spacing 20 ]
            )
    ]
        |> column
            [ centerX
            , padding 40
            , spacing 40
            , width <| maximum 500 <| fill
            , height fill
            , scrollbarY
            ]
        |> Element.layoutWith
            { options =
                [ Element.focusStyle
                    { borderColor = Nothing
                    , backgroundColor = Nothing
                    , shadow = Nothing
                    }
                ]
            }
            [ width fill
            , height fill
            , Background.color <| rgb255 230 230 230
            , Font.family [ Font.monospace ]
            , Font.size 17
            ]


btn msg txt =
    Input.button
        [ hover
        , Border.width 1
        , padding 10
        ]
        { onPress = Just msg
        , label = text txt
        }


hover : Attribute msg
hover =
    Element.mouseOver [ fade ]


fade : Element.Attr a b
fade =
    Element.alpha 0.5


btnFn msg attrs elem =
    Input.button (hover :: attrs)
        { onPress = Just msg
        , label = elem
        }
