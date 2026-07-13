// export default function Profile() {
//   return <h1>Профиль участника</h1>;
// }

import Section from "../../components/ui/Section/Section";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";

export default function Profile() {
    return (
        <Section title="Профиль">
            <Input
                id="name"
                label="Имя"
                placeholder="Введите имя"
            />

            <Input
                id="city"
                label="Город"
                placeholder="Например, Минск"
            />

            <Button>
                Сохранить
            </Button>
        </Section>
    );
}